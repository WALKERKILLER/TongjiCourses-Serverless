import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "乌龙茶课程评价",
    description: "同济大学课程评价与选课指南文档",
    lang: 'zh-CN',
    base: '/wlc/',
    appearance: false,
    router: {
      prefetchLinks: false,
    },

    head: [
      ['link', { rel: 'icon', href: '/wlc/favicon.svg' }],
      ['link', { rel: 'stylesheet', href: '/wlc/custom-styles.css' }],
      ['meta', { name: 'theme-color', content: '#06b6d4' }],
      ['meta', { name: 'og:type', content: 'website' }],
      ['meta', { name: 'og:locale', content: 'zh_CN' }],
      ['meta', { name: 'og:site_name', content: '乌龙茶课程评价' }],
    ],

    themeConfig: {
      // 浅色主题配置
      nav: [
        { text: '必修课', link: '/courses/required/all-courses' },
        { text: '选修课', link: '/courses/elective/all-courses' },
        { text: '说明', link: '/courses/introduction' },
        {
          text: '更多',
          items: [
            { text: '资料附录', link: '/appendix/' },
            { text: '特别鸣谢', link: '/thanks/' }
          ]
        }
      ],

      sidebar: false,

      search: {
        provider: 'local',
        options: {
          locales: {
            root: {
              translations: {
                button: {
                  buttonText: '搜索课程或教师',
                  buttonAriaLabel: '搜索课程或教师'
                },
                modal: {
                  noResultsText: '无法找到相关结果',
                  resetButtonTitle: '清除查询条件',
                  displayDetails: '显示详细信息',
                  footer: {
                    selectText: '选择',
                    navigateText: '切换',
                    closeText: '关闭'
                  }
                }
              }
            }
          }
        }
      },

      outline: {
        label: '页面导航',
        level: [2, 3]
      },

      docFooter: {
        prev: '上一页',
        next: '下一页'
      },

      lastUpdated: {
        text: '最后更新于',
        formatOptions: {
          dateStyle: 'short',
          timeStyle: 'medium'
        }
      }
    },

    // 浅色主题样式定制
    markdown: {
      theme: {
        light: {
          primary: '#06b6d4',
          accent: '#0891b2',
          neutral: '#1e293b',
          bg: '#ffffff',
          text: '#1e293b',
          border: '#e2e8f0',
          light: '#f1f5f9',
          dark: '#0f172a'
        }
      }
    }
  })
