import './assets/base.css'

import { createApp } from 'vue'
import store from './store'
import {
  Button,
  Card,
  ConfigProvider,
  Dropdown,
  Layout,
  Menu,
  Modal,
  Select,
  Spin,
  Tabs,
  Tooltip
} from 'ant-design-vue'
import App from './App.vue'
import axios from 'axios'

const app = createApp(App);

axios.defaults.baseURL = (import.meta as any).env?.VITE_API_URL || ''

app
  .use(Button)
  .use(Card)
  .use(ConfigProvider)
  .use(Dropdown)
  .use(Layout)
  .use(Menu)
  .use(Modal)
  .use(Select)
  .use(Spin)
  .use(Tabs)
  .use(Tooltip)
  .use(store)
  .mount('#app')

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.remove('yourtj-sim-cloak')
  })
})
