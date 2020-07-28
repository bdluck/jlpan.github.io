## netty LengthFieldBasedFrameDecoder源码解析

### 简介

**粘包和半包定义如下：**

1. 粘包和半包，指的都不是一次是正常的 ByteBuf 缓存区接收。

2. 粘包，就是接收端读取的时候，多个发送过来的 ByteBuf “粘”在了一起。

   换句话说，接收端读取一次的 ByteBuf ，读到了多个发送端的 ByteBuf ，是为粘包。

3. 半包，就是接收端将一个发送端的ByteBuf “拆”开了，形成一个破碎的包，我们定义这种 ByteBuf 为半包。

   换句话说，接收端读取一次的 ByteBuf ，读到了发送端的一个 ByteBuf的一部分，是为半包。

## 构造函数

```java
// 这个类有多个构造函数，但是最终都是调用这个方法
public LengthFieldBasedFrameDecoder(
    		// 大小端
            ByteOrder byteOrder, 
    		// 每个包的最大长度（非缓冲区的最大长度）
    		int maxFrameLength, 
    		// 长度域偏移（读取包的长度域的时候会调过这个大小，一般是包头之类的字节长度）
    		int lengthFieldOffset, 
    		// 长度域长度（表示长度域的字节数）
    		int lengthFieldLength,
    		// 长度域调整（调整最终的包长，最终包长等于长度域长度+lengthFieldOffset + lengthFieldLength + lengthAdjustment，该字段可以为负数，主要是补充长度域没有加上的数据或者减去重复计算的长度）
            int lengthAdjustment, 
    		// 丢弃长度（会根据这个长度丢弃包最前面的对应字节）
    		int initialBytesToStrip, 
    		// 快速失败（在出现包长不对的时候直接失败或者下个包来以后再校验失败）
    		boolean failFast) {
    	// 首先判断是否有配置大小端（默认是大端模式）
        if (byteOrder == null) {
            throw new NullPointerException("byteOrder");
        }
		// 检查是否小于0
        checkPositive(maxFrameLength, "maxFrameLength");
		// 检查是否小于0
        checkPositiveOrZero(lengthFieldOffset, "lengthFieldOffset");
		// 检查是否小于0
        checkPositiveOrZero(initialBytesToStrip, "initialBytesToStrip");
        if (lengthFieldOffset > maxFrameLength - lengthFieldLength) {
            throw new IllegalArgumentException(
                    "maxFrameLength (" + maxFrameLength + ") " +
                    "must be equal to or greater than " +
                    "lengthFieldOffset (" + lengthFieldOffset + ") + " +
                    "lengthFieldLength (" + lengthFieldLength + ").");
        }
        this.byteOrder = byteOrder;
        this.maxFrameLength = maxFrameLength;
        this.lengthFieldOffset = lengthFieldOffset;
        this.lengthFieldLength = lengthFieldLength;
        this.lengthAdjustment = lengthAdjustment;
    	// 计算长度域的index，读取的时候直接从缓冲区该位置读
        lengthFieldEndOffset = lengthFieldOffset + lengthFieldLength;
        this.initialBytesToStrip = initialBytesToStrip;
        this.failFast = failFast;
    }
```

### 包解析

**主要解析方法**

```java
protected Object decode(ChannelHandlerContext ctx, ByteBuf in) throws Exception {
    // 首先判断是否进入丢弃模式（默认情况下是false的，只有在收到错误包-包长大于最大限制包长的时候才会开启）
    if (discardingTooLongFrame) {
        discardingTooLongFrame(in);
    }
    // 判断缓冲区的可读数据是否能读到包长（lengthFieldEndOffset就是最小包含长度域的长度）
    if (in.readableBytes() < lengthFieldEndOffset) {
        return null;
    }
    // 拿到实际的readIndex（可读标志+长度域偏移）
    int actualLengthFieldOffset = in.readerIndex() + lengthFieldOffset;
    // 获取长度域数据
    long frameLength = getUnadjustedFrameLength(in, actualLengthFieldOffset, lengthFieldLength, byteOrder);
    // 长度域小于0时，直接会丢弃读取到的长度域并抛出异常
    if (frameLength < 0) {
        failOnNegativeLengthField(in, frameLength, lengthFieldEndOffset);
    }
    // 拿到整个包的实际长度
    frameLength += lengthAdjustment + lengthFieldEndOffset;
    // 整个包的长度小于最小包含长度域的长度时，直接会丢弃读取到的长度域并抛出异常
    if (frameLength < lengthFieldEndOffset) {
        failOnFrameLengthLessThanLengthFieldEndOffset(in, frameLength, lengthFieldEndOffset);
    }
    // 如果包长大于了限制的最大包长，会进入丢弃模式
    if (frameLength > maxFrameLength) {
        exceededFrameLength(in, frameLength);
        return null;
    }
    // never overflows because it's less than maxFrameLength
    int frameLengthInt = (int) frameLength;
    // 当前可读数据不足一个包，直接返回等待下一次读取（这里解决半包问题）
    if (in.readableBytes() < frameLengthInt) {
        return null;
    }
    // 丢弃数据大于包长，直接丢弃包长大小的数据并抛出异常
    if (initialBytesToStrip > frameLengthInt) {
        failOnFrameLengthLessThanInitialBytesToStrip(in, frameLength, initialBytesToStrip);
    }
    // 丢弃对应长度数据
    in.skipBytes(initialBytesToStrip);

    // extract frame
    int readerIndex = in.readerIndex();
    // 获取丢弃后的包长
    int actualFrameLength = frameLengthInt - initialBytesToStrip;
    // 读取对应长度数据
    ByteBuf frame = extractFrame(ctx, in, readerIndex, actualFrameLength);
    in.readerIndex(readerIndex + actualFrameLength);
    return frame;
}
```

**触发丢弃模式方法**（当读取的包长度大于限制包长度时进入）

```java
private void exceededFrameLength(ByteBuf in, long frameLength) {
    // 记录剩余需要丢弃的长度
    long discard = frameLength - in.readableBytes();
    // 记录当前超长的包（后续抛出异常日志使用）
    tooLongFrameLength = frameLength;
    if (discard < 0) {
        // 当前缓冲区数据足够丢弃超长的包时，直接丢弃
        in.skipBytes((int) frameLength);
    } else {
        // 不够丢弃数据时，进入丢弃模式
        discardingTooLongFrame = true;
        // 记录还需要丢弃的数据
        bytesToDiscard = discard;
        // 丢弃整个缓冲区
        in.skipBytes(in.readableBytes());
    }
    // 失败方法
    failIfNecessary(true);
}
```

**丢弃模式方法**

```java
// 丢弃数据 
private void discardingTooLongFrame(ByteBuf in) {
    // 记录需要丢弃数据长度的字段
    long bytesToDiscard = this.bytesToDiscard;
    // 比较需要丢弃的数据长度和当前包长大小
    int localBytesToDiscard = (int) Math.min(bytesToDiscard, in.readableBytes());
    // 舍弃缓冲区内对应数据长度
    in.skipBytes(localBytesToDiscard);
    // 减去已经丢弃的数据（为0的时候代表丢弃完成）
    bytesToDiscard -= localBytesToDiscard;
    this.bytesToDiscard = bytesToDiscard;
    // 失败方法
    failIfNecessary(false);
}
```

**失败方法**

```java

private void failIfNecessary(boolean firstDetectionOfTooLongFrame) {
    if (bytesToDiscard == 0) {
        // 数据已经完成丢弃，将重置为初始状态
        // the frame was too large.
        long tooLongFrameLength = this.tooLongFrameLength;
        // 重置tooLongFrameLength为0（记录进入丢弃方法的包长）
        this.tooLongFrameLength = 0;
        // 退出丢弃模式
        discardingTooLongFrame = false;
        // 快速丢弃模式下会直接抛出异常，否则会在下一次进入时抛出异常
        if (!failFast || firstDetectionOfTooLongFrame) {
            fail(tooLongFrameLength);
        }
    } else {
        // Keep discarding and notify handlers if necessary.
        if (failFast && firstDetectionOfTooLongFrame) {
            fail(tooLongFrameLength);
        }
    }
}
private void fail(long frameLength) {
    if (frameLength > 0) {
        throw new TooLongFrameException(
            "Adjusted frame length exceeds " + maxFrameLength +
            ": " + frameLength + " - discarded");
    } else {
        throw new TooLongFrameException(
            "Adjusted frame length exceeds " + maxFrameLength +
            " - discarding");
    }
}

```

**总结**

​	其实netty提供的拆包器是根据读取长度域实现的，核心目标是读取到提供的长度域，再根据配置项修正长度域为整包的长度，最终读取到整包后返回给用户。该拆包器基本能够满足需求，这次看了下源码做一个记录。