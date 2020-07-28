module.exports = {
  title: '蓝色客栈',
  serviceWorker: true,
  markdown: {
    // 显示代码行号
    lineNumbers: true
  },
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      {
        text: 'rember',
        items: [
          { text: 'rember', link: '/rember/Rember'},
          { text: '其他', link: '/rember/Rember1' },
        ]
      },
      { text: 'java', link: '/java/Java' },
      {
        text: '链接',
        items: [
          { text: 'GitHub', link: 'https://github.com/jlpan' },
          { text: '码云', link: 'https://gitee.com/jlpan' },
        ]
      }
    ],
    sidebar: 'auto',
    dateFormat: 'YYYY-MM-dd',
    lastUpdated: '最后更新时间',
  }
}