import './assets/base.css'

import { createApp } from 'vue'
import store from './store'
import Antd from 'ant-design-vue';
import App from './App.vue'
import axios from 'axios'

const app = createApp(App);

axios.defaults.baseURL = (import.meta as any).env?.VITE_API_URL || ''

app.use(Antd).use(store).mount('#app')
