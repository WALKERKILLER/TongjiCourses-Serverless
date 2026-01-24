---
layout: home

hero:
  name: "乌龙茶"
  text: "同济大学课程评价"

features:
  - title: 📚 必修课
    details: 高等数学、线性代数、概率论、物理、英语、程序设计等必修课程评价
    link: /courses/required/all-courses
    linkText: 查看必修课 →
  - title: 📖 选修课
    details: 通识选修、精品课程、核心课程等选修课程评价
    link: /courses/elective/all-courses
    linkText: 查看选修课 →
  - title: 🔍 快速搜索
    details: 使用搜索功能快速找到目标课程或教师评价
    link: /courses/introduction
    linkText: 搜索技巧 →
---

## 使用说明

::: tip 如何使用
1. **搜索课程**：使用上方搜索框（按 `Ctrl + K` 或 `Cmd + K` 激活）输入课程名称或教师姓名
2. **浏览评价**：点击上方按钮进入必修课或选修课页面，使用左侧导航和 `Ctrl+F` 浏览
3. **查看详情**：点击具体课程查看详细评价、考核方式、给分情况等
:::

## 重要提示

::: warning 免责声明
本文仅针对课程本身进行评论，对于选课产生的一切后果概不负责。在选课系统开放前，请务必用最近导出的本学期全校课表核对信息。所有信息以选课系统实际和课程实际为准。
:::

::: tip 关于评价
以下资料来源于历史经验，存在时效性问题。并且只是学长学姐们的个人主观反馈，未免不够全面，不可尽信。希望大家谨慎甄别，不要被一两条主观意见误导。
:::

## 相关链接

- [选课社区网页版](https://www.tongji.icu/) - 新版乌龙茶
- [课程评价收集](https://woailikeai.github.io/2023/02/15/addComments/) - 提交您的课程评价
- [资料附录](/appendix/) - 相关资料下载
- [特别鸣谢](/thanks/) - 感谢所有贡献者

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 等待 DOM 加载完成
  setTimeout(() => {
    // 清理所有旧的搜索框
    document.querySelectorAll('.hero-search-box').forEach(el => el.remove())

    // 查找搜索按钮
    const checkSearchButton = setInterval(() => {
      const searchButton = document.querySelector('.DocSearch-Button, .VPNavSearch .search-box')
      if (searchButton) {
        clearInterval(checkSearchButton)

        // 创建首页大搜索框
        const heroSection = document.querySelector('.VPHero')
        if (heroSection) {
          const heroMain = heroSection.querySelector('.main')
          if (heroMain) {
            // 创建搜索按钮容器
            const searchContainer = document.createElement('div')
            searchContainer.className = 'hero-search-box'
            searchContainer.innerHTML = `
              <button class="hero-search-button" aria-label="搜索课程或教师">
                <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>搜索课程或教师</span>
                <kbd>Ctrl K</kbd>
              </button>
            `

            // 添加点击事件
            const heroButton = searchContainer.querySelector('.hero-search-button')
            heroButton.addEventListener('click', () => {
              searchButton.click()
            })

            // 将搜索框添加到 hero main 中，放在最后
            heroMain.appendChild(searchContainer)
          }
        }
      }
    }, 100)

    // 10秒后停止检查
    setTimeout(() => clearInterval(checkSearchButton), 10000)
  })
})
</script>

<style>
/* 强制 Hero 区域居中 */
.VPHero {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.VPHero .container {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  width: 100% !important;
  max-width: 100% !important;
}

.VPHero .main {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
}

.VPHero .name,
.VPHero .text {
  width: 100% !important;
  text-align: center !important;
}

.hero-search-box {
  margin-top: 2rem !important;
  display: flex !important;
  justify-content: center !important;
}

.hero-search-button {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
  transition: all 0.3s ease;
  min-width: 320px;
  justify-content: center;
}

.hero-search-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.4);
  background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%);
}

.hero-search-button:active {
  transform: translateY(0);
}

.hero-search-button .search-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.hero-search-button kbd {
  margin-left: auto;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: inherit;
}

@media (max-width: 768px) {
  .hero-search-button {
    width: 100%;
    min-width: auto;
  }
}
</style>
