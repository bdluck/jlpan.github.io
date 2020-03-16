module.exports = {
  title: '@jlpan.top',
  serviceWorker: true,
  markdown: {
    // 显示代码行号
    lineNumbers: false
  },
  themeConfig: {
      nav: [
        { text: '首页', link: '/' },
        { text: '链接',
          items: [
              {text:'GitHub',link: 'https://github.com/jlpan' },
              {text:'码云',link: 'https://gitee.com/jlpan' },
          ]
        }
      ],
      lastUpdated: 'Last Updated', 
    }
}