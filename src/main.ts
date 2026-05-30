import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import AdminPage from './views/AdminPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/welcome-to-admin' },
    { path: '/:pageSlug', component: AdminPage },
  ],
})

createApp(App).use(router).mount('#app')
