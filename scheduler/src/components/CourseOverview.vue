<template>
    <div
        class="flex flex-col w-full"
    >
        <div class="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mt-4 mb-4">
            <div>
                <a-radio-group v-model:value="selectedType" @change="$emit('update:selectedRowKeys', [])" class="w-full">
                <a-radio-button value="compulsory">计划内课程</a-radio-button>
                <a-radio-button value="optional">通识选修课</a-radio-button>
                <a-radio-button value="search">高级检索</a-radio-button>
            </a-radio-group>
            </div>
            <div>
                <a-input
                    placeholder="请输入课程代码或课程名称"
                    v-model:value="searchValue"
                    class="w-full md:w-[250px]"
                    allow-clear
                >
                    <template #prefix>
                        <SearchOutlined />
                    </template>
                </a-input>
            </div>
        </div>
        <div v-if="selectedType === 'compulsory'">
            <div class="max-h-[60vh] md:h-150 overflow-auto">
                <a-table
                :columns="columns.compulsory"
                v-for="courses in $store.getters.sortCompulsoryCoursesByGrade"
                :key="courses.grade"
                :data-source="filteredCourses(courses.courses)"
                :pagination="false"
                :title="() => courses.grade + '级'"
                :row-selection="{ 
                    selectedRowKeys: localSelectedRowKeys.filter((key: string) => key.startsWith('必_' + courses.grade + '_')), 
                    onChange: (keys: string[]) => onCompulsorySelectChange(keys)
                }"
                :row-key="(record: any) => '必_' + courses.grade + '_' + record.courseCode"
                :row-class-name="(_record: any, index: number) => index % 2 === 1 ? 'bg-gray-50' : ''"
            >
            </a-table>
            </div>
        </div>
        <div v-else-if="selectedType === 'optional'">
            <a-tabs v-model:activeKey="selectedOptionalType">
                <a-tab-pane v-for="type in $store.state.commonLists.optionalTypes" :key="type.courseLabelId" :tab="type.courseLabelName">
                    <div class="max-h-[60vh] md:h-150 overflow-auto">
                        <a-table
                        :columns="columns.optional"
                        :data-source="filteredCourses($store.state.commonLists.optionalCourses.find((item: any) => item.courseLabelId === type.courseLabelId)?.courses)"
                        :pagination="false"
                        :row-selection="{ 
                            selectedRowKeys: localSelectedRowKeys.filter((key: string) => key.startsWith('选_' + type.courseLabelId + '_')), 
                            onChange: (keys: string[]) => onOptionalSelectChange(keys) 
                        }"
                        :row-key="(record: any) => '选_' + type.courseLabelId + '_' + record.courseCode"
                        :row-class-name="(_record: any, index: number) => index % 2 === 1 ? 'bg-gray-50' : ''"
                    >
                    </a-table>
                    </div>
                </a-tab-pane>
            </a-tabs>
        </div>
        <div v-else-if="selectedType === 'search'">
            <div>
                <AdvancedSearch :searchValue="searchValue"  v-model:selectedRowKeys="localSelectedRowKeys" />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { SearchOutlined } from '@ant-design/icons-vue';
import type { stagedCourse, courseInfo } from '@/utils/myInterface';
import { defineAsyncComponent } from 'vue';

export default {
    data() {
        return {
            // 最外层选项卡
            selectedType: 'compulsory', // 必修 | 选修
            selectedOptionalType: '', // 选修课类型
            
            // 表格
            columns: {
                compulsory: [
                    {
                        title: '课程代码',
                        dataIndex: 'courseCode',
                        align: 'center'
                    },
                    {
                        title: '课程名称',
                        dataIndex: 'courseName',
                        align: 'center'
                    },
                    {
                        title: '开课学院',
                        dataIndex: 'faculty',
                        align: 'center',
                        responsive: ['md']
                    },
                    {
                        title: '学分',
                        dataIndex: 'credit',
                        align: 'center'
                    },
                    {
                        title: '课程性质',
                        dataIndex: 'courseNature',
                        align: 'center',
                        customRender: ({ text }: { text: string[] }) => text ? text.join('、') : '',
                        responsive: ['md']
                    }
                ],
                optional: [
                    {
                        title: '课程代码',
                        dataIndex: 'courseCode',
                        align: 'center'
                    },
                    {
                        title: '课程名称',
                        dataIndex: 'courseName',
                        align: 'center'
                    },
                    {
                        title: '开课学院',
                        dataIndex: 'faculty',
                        align: 'center',
                        responsive: ['md']
                    },
                    {
                        title: '学分',
                        dataIndex: 'credit',
                        align: 'center'
                    },
                    {
                        title: '校区',
                        dataIndex: 'campus',
                        align: 'center',
                        customRender: ({ text }: { text: string[] }) => text ? text.join('、') : '',
                        responsive: ['md']
                    }
                ]
            },

            // 搜索
            searchValue: ''
        }
    },
    props: ['selectedRowKeys'],
    methods: {
        onCompulsorySelectChange(localSelectedRowKeys: string[]) {
            this.localSelectedRowKeys = localSelectedRowKeys;
            // console.log('localSelectedRowKeys changed: ', this.localSelectedRowKeys);
        },
        onOptionalSelectChange(localSelectedRowKeys: string[]) {
            this.localSelectedRowKeys = localSelectedRowKeys;
            // console.log('localSelectedRowKeys changed: ', this.localSelectedRowKeys);
        },
        filteredCourses(courses: courseInfo[]) {
            // 根据已选课程来过滤，德摩根律啊！思考一下为什么是 && 而不是 ||
            courses = courses.filter((course: courseInfo) => {
                return !this.$store.state.commonLists.stagedCourses.some((stagedCourse: stagedCourse) => stagedCourse.courseCode === course.courseCode);
                // && !this.$store.state.commonLists.selectedCourses.some(selectedCourse => selectedCourse.courseCode === course.courseCode) // 这句不需要，因为被上面的包含了
            });

            // 保留表格中和 this.searchValue 代码或者名称匹配的课程
            if (this.searchValue === '') {
                return courses;
            }
            else {
                // 根据检索条件过滤课程
                return courses.filter(course => course.courseCode.includes(this.searchValue) || course.courseName.includes(this.searchValue));
            }
        }
    },
    mounted() {
        // 设置默认选修课类型
        if (this.$store.state.commonLists.optionalTypes.length > 0) {
            this.selectedOptionalType = this.$store.state.commonLists.optionalTypes[0].courseLabelId;
        }
    },
    components: {
        SearchOutlined,
        AdvancedSearch: defineAsyncComponent(() => import('@/components/AdvancedSearch.vue'))
    },
    computed: {
        localSelectedRowKeys: {
            get() {
                // console.log("本地的！", this.selectedRowKeys);
                return this.selectedRowKeys;
            },
            set(value: string[]) {
                // console.log("我也更新：", value);
                this.$emit('update:selectedRowKeys', value);
            }
        }
    }
}
</script>
