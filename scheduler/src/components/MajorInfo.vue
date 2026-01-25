<template>
    <a-layout-content class="m-2">
        <a-card
            title="专业选择"
        >
        <div class="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch md:items-center">
            <div class="flex flex-row gap-3 items-center">
                <p>学期</p>
                <a-select
                    :value="$store.state.majorSelected.calendarId"
                    placeholder="请选择学期"
                    @change="findGradeByCalendarId"
                    class="w-full md:w-48"
                >
                    <a-select-option
                        v-for="calendar in rawList.calendars"
                        :value="calendar.calendarId"
                        :key="calendar.calendarId"
                    >
                        {{ calendar.calendarName }}
                    </a-select-option>
                </a-select>
            </div>
            <div class="flex flex-row gap-3 items-center">
                <p>年级</p>
                <a-select
                    :value="$store.state.majorSelected.grade"
                    placeholder="请选择年级"
                    @change="findMajorByGrade"
                    class="w-full md:w-32"
                >
                    <a-select-option
                        v-for="grade in rawList.grades"
                        :value="grade"
                        :key="grade"
                    >
                        {{ grade }}
                    </a-select-option>
                </a-select>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div class="flex items-center space-x-2">
                    <p>专业</p>
                    <a-tooltip placement="topLeft" overlayClassName="max-w-md major-help-tooltip">
                        <template #title>
                            <div class="text-sm space-y-2">
                                <p class="font-semibold">不确定专业代码？按以下步骤查询：</p>
                                <ol class="list-decimal pl-4 space-y-2">
                                    <li>登录 <a href="https://1.tongji.edu.cn" target="_blank" class="text-blue-600 underline hover:text-blue-800">1系统</a></li>
                                    <li>
                                        <div class="flex items-start space-x-2">
                                            <span class="flex-1">回到当前页面，<strong>点击下方按钮复制链接</strong>，然后在地址栏粘贴并访问：</span>
                                        </div>
                                        <a-button 
                                            size="small" 
                                            type="primary" 
                                            @click="copyApiUrl" 
                                            class="mt-1 w-full"
                                        >
                                            <span class="flex items-center justify-center gap-1">
                                                <CopyOutlined /> 复制查询链接
                                            </span>
                                        </a-button>
                                        <code class="bg-gray-200 px-2 py-1 rounded text-xs block mt-1 break-all text-gray-800">{{ majorInfoApiUrl }}</code>
                                    </li>
                                    <li>在返回的JSON数据中找到 <code class="bg-gray-200 px-1 py-0.5 rounded text-xs text-gray-800">profession</code> 字段，即为您的专业代码</li>
                                    <li>根据专业代码和年级，在下拉框中选择对应专业</li>
                                </ol>
                                <p class="text-xs text-gray-600 mt-2">💡 提示：使用浏览器的查找功能（Ctrl+F）搜索"profession"更便捷</p>
                                <p class="text-xs text-orange-600 mt-1">⚠️ 注意：必须先登录1系统，再访问API地址，否则会被拒绝访问</p>
                            </div>
                        </template>
                        <QuestionCircleOutlined class="text-gray-400 hover:text-blue-500 cursor-help text-sm transition-colors" />
                    </a-tooltip>
                </div>
                <a-select
                    :value="$store.state.majorSelected.major"
                    placeholder="请选择专业"
                    show-search
                    allow-clear
                    @change="onMajorChange"
                    class="w-full md:w-[420px]"
                    :filter-option="filterMajor"
                >
                    <a-select-option
                            v-for="major in rawList.majors"
                            :value="major.code"
                            :label="major.name"
                            :key="major.code"
                        >
                            {{ major.name }}
                        </a-select-option>
                </a-select>
            </div>            
        </div>
        </a-card>
    </a-layout-content>
</template>

<script lang="ts">
import axios from 'axios';
import { errorNotify, successNotify } from '@/utils/notify';
import { QuestionCircleOutlined, CopyOutlined } from '@ant-design/icons-vue';

export default {
    components: {
        QuestionCircleOutlined,
        CopyOutlined
    },
    data() {
        return {
            rawList: {
                calendars: [] as { calendarId: number, calendarName: string }[],
                grades: [],
                majors: [] as { code: string, name: string }[]
            }
        }
    },
    computed: {
        majorInfoApiUrl(): string {
            // 是最新的学期ID
            const calendarId = this.rawList.calendars.length > 0 ? this.rawList.calendars[0].calendarId : 1;
            return `https://1.tongji.edu.cn/api/electionservice/student/getElecStudentInfo?calendarId=${calendarId}`;
        }
    },
    methods: {
        async getAllCalendar() {
            this.$store.commit("setSpin", true);

            try {
                const res = await axios({
                    url: '/api/getAllCalendar',
                    method: 'get'
                });
                this.rawList.calendars = res.data.data;
            }
            catch (error: unknown) {
                // console.log("error:", error);
                const err = error as { response?: { data?: { msg?: string } } };
                errorNotify(err.response?.data?.msg || '获取学期失败');
            }
            finally {
                this.$store.commit("setSpin", false);
            }
        },
        async findGradeByCalendarId(value: number) {
            this.$store.commit('setSpin', true);
            this.$store.commit('clearStagednSelectedCourses');
            this.$store.commit('setMajorInfo', 
                {
                    calendarId: value,
                    grade: undefined,
                    major: undefined
                }
            )
            try {
                const res = await axios({
                    url: '/api/findGradeByCalendarId',
                    method: 'post',
                    data: {
                        calendarId: this.$store.state.majorSelected.calendarId
                    }
                });
                this.rawList.grades = res.data.data.gradeList;
                // 在年级更改时清空专业
                this.rawList.majors = [];
            }
            catch (error: unknown) {
                // console.log("error:", error);
                const err = error as { response?: { data?: { msg?: string } } };
                errorNotify(err.response?.data?.msg || '获取专业失败');
            }
            finally {
                this.$store.commit('setSpin', false);
            }
        },
        async findMajorByGrade(value: number) {
            this.$store.commit('setSpin', true);
            this.$store.commit('clearStagednSelectedCourses');
            this.$store.commit('setMajorInfo', 
                {
                    calendarId: this.$store.state.majorSelected.calendarId,
                    grade: value,
                    major: undefined
                }
            )
            try {
                const res = await axios({
                    url: '/api/findMajorByGrade',
                    method: 'post',
                    data: {
                        grade: this.$store.state.majorSelected.grade
                    }
                });
                this.rawList.majors = res.data.data;
            }
            catch (error: unknown) {
                // console.log("error:", error);
                const err = error as { response?: { data?: { msg?: string } } };
                errorNotify(err.response?.data?.msg || '获取专业失败');
            }
            finally {
                this.$store.commit('setSpin', false);
            }
        },
        onMajorChange(value: string) {
            this.$emit('changeMajor')
            this.$store.commit('clearStagednSelectedCourses');
            this.$store.commit('setMajorInfo', 
                {
                    calendarId: this.$store.state.majorSelected.calendarId,
                    grade: this.$store.state.majorSelected.grade,
                    major: value
                }
            )
        },
        filterMajor(input: string, option: { label: string, value: string }) {
            return option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0;
        },
        async copyApiUrl() {
            try {
                await navigator.clipboard.writeText(this.majorInfoApiUrl);
                successNotify('链接已复制到剪贴板！请在当前页面的地址栏粘贴访问');
            } catch {
                errorNotify('复制失败，请手动复制链接');
            }
        }
    },
    async mounted() {
        this.$store.commit("loadSolidify");

        await this.getAllCalendar()
        
        if (!this.$store.state.majorSelected.calendarId && this.rawList.calendars.length > 0) {
            this.$store.commit('setMajorInfo', {
                calendarId: this.rawList.calendars[0].calendarId,
                grade: undefined,
                major: undefined
            });
            await this.findGradeByCalendarId(this.rawList.calendars[0].calendarId);
        }

        if (this.$store.state.majorSelected.calendarId) {
            this.$store.commit('setSpin', true);
            try {
                const res = await axios({
                    url: '/api/findGradeByCalendarId',
                    method: 'post',
                    data: {
                        calendarId: this.$store.state.majorSelected.calendarId
                    }
                });
                this.rawList.grades = res.data.data.gradeList;
                // 在年级更改时清空专业
                this.rawList.majors = [];
            }
            catch (error: unknown) {
                // console.log("error:", error);
                const err = error as { response?: { data?: { msg?: string } } };
                errorNotify(err.response?.data?.msg || '获取年级信息失败');
            }
            finally {
                this.$store.commit('setSpin', false);
            }
        }

        if (this.$store.state.majorSelected.grade) {
            this.$store.commit('setSpin', true);
            try {
                const res = await axios({
                    url: '/api/findMajorByGrade',
                    method: 'post',
                    data: {
                        grade: this.$store.state.majorSelected.grade
                    }
                });
                this.rawList.majors = res.data.data;
            }
            catch (error: unknown) {
                const err = error as { response?: { data?: { msg?: string } } };
                errorNotify(err.response?.data?.msg || '获取专业信息失败');
            }
            finally {
                this.$store.commit('setSpin', false);
            }
        }
},
    emit: ['changeMajor']
}
</script>

<style>
.major-help-tooltip .ant-tooltip-inner {
    background-color: white;
    color: #000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border: 1px solid #e8e8e8;
}

.major-help-tooltip .ant-tooltip-arrow-content {
    background-color: white;
    border: 1px solid #e8e8e8;
}
</style>
