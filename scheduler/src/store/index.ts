import { createStore } from "vuex";
import { canAddCourse, insertOccupied, deleteOccupied, isSameCourse } from "@/utils/courseManipulate";
import type { 
    courseDetaillet, 
    baseInfoTriplet, 
    courseInfo, 
    clickedCourseInfo,
    stagedCourse,
    optionalCourseType,
    occupyCell,
    courseOnTable
 } from "@/utils/myInterface";
import { errorNotify } from "@/utils/notify";
import type { State } from "vue";

type StoreState = State;

const store = createStore<StoreState>({
    state() {
        return {
            // 检索的基本信息
            majorSelected: {
                calendarId: undefined,
                grade: undefined,
                major: undefined
            },
            // 通用列表
            commonLists: {
                // 显示在 courseOverview 页面的课程列表
                compulsoryCourses: [], // 必修课
                optionalTypes: [], // 选修课类型
                optionalCourses: [], // 选修课
                searchCourses: [], // 通过搜索得到的课程

                // 选择课程时的课程列表
                stagedCourses: [], // 备选课程
                selectedCourses: [], // 已选课程
            },
            // 点击的课程信息
            clickedCourseInfo: {
                courseCode: '',
                courseName: ''
            },
            // 课程表数据
            occupied: Array(12).fill(null).map(() => Array(7).fill(undefined).map(() => [])), // 12 * 7 的二维数组，每个元素是一个数组
            timeTableData: [], // 课程表数据
            // 标志位
            flags: {
                majorNotChanged: false, // 专业是否被改变，如果改变了，需要重新向后端请求数据
                isDataOutdated: false // 数据是否过期
            },
            updateTime: '',
            latestUpdateTime: '', // 后端的最新更新时间
            isSpin: false
        }
    },
    mutations: {
        setMajorInfo(state: StoreState, payload: baseInfoTriplet) {
            state.majorSelected = payload;
            state.flags.majorNotChanged = false;
        },
        setCompulsoryCourses(state: StoreState, payload: courseInfo[]) {
            state.commonLists.compulsoryCourses = payload;
            state.flags.majorNotChanged = true;
        },
        setOptionalTypes(state: StoreState, payload: optionalCourseType[]) {
            // console.log(payload);
            state.commonLists.optionalTypes = payload;
        },
        setOptionalCourses(state: StoreState, payload: courseInfo[]) {
            state.commonLists.optionalCourses = payload;
            // console.log(state.commonLists.optionalCourses);
        },
        setSearchedCourses(state: StoreState, payload: courseInfo[]) {
            // console.log(payload);
            state.commonLists.searchCourses = payload;
        },
        pushStagedCourse(state: StoreState, payload: stagedCourse) {
            state.commonLists.stagedCourses.push(payload);
            // console.log(state.commonLists.stagedCourses.length);
        },
        popStagedCourse(state: StoreState, payload: string) {
            // 清除和退课共用一个方法
            // console.log("退课", payload);
            state.commonLists.stagedCourses = state.commonLists.stagedCourses.filter((course: stagedCourse) => course.courseCode !== payload);
            state.commonLists.selectedCourses = state.commonLists.selectedCourses.filter((course: string) => course.substring(0, course.length - 2) !== payload);
            state.timeTableData = state.timeTableData.filter((course: courseOnTable) => course.code.substring(0, course.code.length - 2) !== payload);
            const codeOfCourse = state.occupied.flat().flat().find((item: occupyCell) => item.code.substring(0, item.code.length - 2) === payload)?.code;

            if (codeOfCourse) {
                deleteOccupied(state.occupied, codeOfCourse); // deleteOccupied 接收的是包含班号的课号，所以对于 courseCode，需要找到班号
            }

            // 点击课程清空
            state.clickedCourseInfo = {
                courseCode: '',
                courseName: ''
            };

            // console.log(state.clickedCourseInfo);
        },
        setClickedCourseInfo(state: StoreState, payload: clickedCourseInfo) {
            // console.log(payload);
            state.clickedCourseInfo = payload;
        },
        clearStagednSelectedCourses(state: StoreState) {
            state.commonLists.stagedCourses = [];
            state.commonLists.selectedCourses = [];
            state.timeTableData = [];
            state.occupied = Array(12).fill(null).map(() => Array(7).fill(undefined).map(() => []));
            state.clickedCourseInfo = {
                courseCode: '',
                courseName: ''
            };
        },
        updateTimeTable(state: StoreState, payload: courseDetaillet) {      
            // console.log("排课信息:", payload)

            const retOfCanAddCourse = canAddCourse(payload.arrangementInfo, state.occupied, payload.code);

            if (retOfCanAddCourse.canAdd) {
                const sameCodeCourse = state.timeTableData?.find((course: courseOnTable) => isSameCourse(course.code, payload.code));

                // 规定相同课号的课只能有一个
                if (sameCodeCourse) {
                    state.timeTableData = state.timeTableData.filter((course: courseOnTable) => !isSameCourse(course.code, payload.code));
                    deleteOccupied(state.occupied, sameCodeCourse.code);

                    // console.log("stagedCourses:", state.commonLists.stagedCourses);

                    // 修改状态文字
                    const stagedCourse = state.commonLists.stagedCourses
                                        .find((course: stagedCourse) => course.courseCode === payload.code.substring(0, payload.code.length - 2));
                    if (stagedCourse) {
                        // console.log("目标", stagedCourse);
                        const targetCourse = stagedCourse.courseDetail.find((course: courseDetaillet) => isSameCourse(course.code, payload.code) && course.status === 1);
                        if (targetCourse) {
                            // console.log("找到了！");
                            targetCourse.status = 0;
                        }
                    }
                }

                // 存到课表数据中
                payload.arrangementInfo.forEach(
                    (arrangement) => {
                        const courseOnTable = { // 每次需要重新创建一个对象，否则会出现引用问题
                            showText: arrangement.teacherAndCode + ' ' 
                                      + state.clickedCourseInfo.courseName + '(' + payload.code + ') ' 
                                      + arrangement.arrangementText,
                            courseName: state.clickedCourseInfo.courseName,
                            code: payload.code,
                            occupyTime: arrangement.occupyTime,
                            occupyDay: arrangement.occupyDay,
                        }
                        // console.log("push 了星期", courseOnTable.occupyDay);
                        state.timeTableData.push(courseOnTable);
                    }
                );

                // console.log("当前课表数据：", state.timeTableData);

                // 更新占用情况
                insertOccupied(state.occupied, payload.arrangementInfo, payload.code, state.clickedCourseInfo.courseName);

                // 修改状态文字
                payload.status = 1;
                const stagedCourse = state.commonLists.stagedCourses.find((course: stagedCourse) => course.courseCode === payload.code.substring(0, payload.code.length - 2));
                if (stagedCourse) {
                    stagedCourse.status = 1;
                    stagedCourse.teacher = payload.teachers;
                }

                // 修改教师信息
            }
            else {
                errorNotify("课程与「" + retOfCanAddCourse.collideCourse + "」冲突");
                // console.log("课程冲突");
            }
        },
        saveSelectedCourses(state: StoreState) {
            // 要修改两件事：1. stagedCourses 的 status 2. 添加新的 selectedCourses
            state.commonLists.stagedCourses.forEach((course: stagedCourse) => {
                // console.log(course);
                if (course.status === 1) {
                    // 修改状态为 2
                    course.status = 2;
                    
                    // 把 courseDetail 中的 status 也修改为 2，并且 push 到 selectedCourses 中
                    course.courseDetail.forEach((detail: courseDetaillet) => {
                        if (detail.status === 1) {
                            detail.status = 2;
                            state.commonLists.selectedCourses.push(detail.code);
                        }
                        else if (detail.status === 2) {
                            detail.status = 0; // 如果是之前选的课，要修改状态为未选
                            state.commonLists.selectedCourses = state.commonLists.selectedCourses.filter((code: string) => code !== detail.code);
                        }
                    });
                }
            });
        },
        setSpin(state: StoreState, payload: boolean) {
            state.isSpin = payload;
        },
        setUpdateTime(state: StoreState, payload: string) {
            state.updateTime = payload;
            localStorage.setItem("updateTime", state.updateTime);
            console.log("Update time set to:", state.updateTime);
        },
        setLatestUpdateTime(state: StoreState, payload: string) {
            state.latestUpdateTime = payload;
            console.log("Latest update time set to:", state.latestUpdateTime);
        },
        setDataOutdated(state: StoreState, payload: boolean) {
            state.flags.isDataOutdated = payload;
        },
        syncLatestData(state: StoreState) {
            // 同步最新数据：清除课程缓存并更新时间
            localStorage.removeItem("stagedCourses");
            localStorage.removeItem("selectedCourses");
            localStorage.removeItem("occupied");
            localStorage.removeItem("timeTableData");
            state.commonLists.stagedCourses = [];
            state.commonLists.selectedCourses = [];
            state.timeTableData = [];
            state.occupied = Array(12).fill(null).map(() => Array(7).fill(undefined).map(() => []));
            state.clickedCourseInfo = {
                courseCode: '',
                courseName: ''
            };
            state.updateTime = state.latestUpdateTime;
            localStorage.setItem("updateTime", state.updateTime);
            state.flags.isDataOutdated = false;
        },
        smartSyncCourses(state: StoreState, payload: { 
            newStagedCourses: stagedCourse[], 
            newSelectedCodes: string[],
            newOccupied: occupyCell[][][],
            newTimeTableData: courseOnTable[]
        }) {
            // 智能同步：更新课程信息但保留用户选择
            state.commonLists.stagedCourses = payload.newStagedCourses;
            state.commonLists.selectedCourses = payload.newSelectedCodes;
            state.occupied = payload.newOccupied;
            state.timeTableData = payload.newTimeTableData;
            state.updateTime = state.latestUpdateTime;
            
            // 更新localStorage
            localStorage.setItem("stagedCourses", JSON.stringify(state.commonLists.stagedCourses));
            localStorage.setItem("selectedCourses", JSON.stringify(state.commonLists.selectedCourses));
            localStorage.setItem("occupied", JSON.stringify(state.occupied));
            localStorage.setItem("timeTableData", JSON.stringify(state.timeTableData));
            localStorage.setItem("updateTime", state.updateTime);
            
            state.flags.isDataOutdated = false;
        },
        solidify(state: StoreState) {
            localStorage.setItem("majorSelected", JSON.stringify(state.majorSelected));
            localStorage.setItem("stagedCourses", JSON.stringify(state.commonLists.stagedCourses));
            localStorage.setItem("selectedCourses", JSON.stringify(state.commonLists.selectedCourses));
            localStorage.setItem("occupied", JSON.stringify(state.occupied));
            localStorage.setItem("timeTableData", JSON.stringify(state.timeTableData));
        },
        loadSolidify(state: StoreState) {
            const majorSelected = localStorage.getItem("majorSelected");
            if (majorSelected) {
                console.log(majorSelected);
                state.majorSelected = JSON.parse(majorSelected);
                console.log(state.majorSelected);
            }
            const stagedCourses = localStorage.getItem("stagedCourses");
            if (stagedCourses) {
                state.commonLists.stagedCourses = JSON.parse(stagedCourses);
            }
            const selectedCourses = localStorage.getItem("selectedCourses");
            if (selectedCourses) {
                state.commonLists.selectedCourses = JSON.parse(selectedCourses);
            }
            const occupied = localStorage.getItem("occupied");
            if (occupied) {
                state.occupied = JSON.parse(occupied);
            }
            const timeTableData = localStorage.getItem("timeTableData");
            if (timeTableData) {
                state.timeTableData = JSON.parse(timeTableData);
            }
        },
        clearSolidify() {
            localStorage.removeItem("majorSelected");
            localStorage.removeItem("stagedCourses");
            localStorage.removeItem("selectedCourses");
            localStorage.removeItem("occupied");
            localStorage.removeItem("timeTableData");
        },
        clearSolidifyCourse() {
            localStorage.removeItem("stagedCourses");
            localStorage.removeItem("selectedCourses");
            localStorage.removeItem("occupied");
            localStorage.removeItem("timeTableData");
        },
        loadSolidifyTime(state: StoreState) {
            const updateTime = localStorage.getItem("updateTime");
            if (updateTime) {
                state.updateTime = updateTime;
            }
        }
    },
    getters: {
        isMajorSelected(state: StoreState) {
            // console.log(',', state.majorSelected);
            return state.majorSelected.calendarId && state.majorSelected.grade && state.majorSelected.major;
        },
        sortCompulsoryCoursesByGrade(state: StoreState) {
            // 返回一个数组
            // 每个元素是一个对象，对象的key是年级，value是一个数组，数组中是这个年级的必修课
            // value 按照课程号排序
            // 年级按降序排序
            const sortedCourses: { [key: number]: courseInfo[] } = {};
            state.commonLists.compulsoryCourses.forEach((course: courseInfo) => {
                if (course.grade !== undefined) {
                    if (!sortedCourses[course.grade]) {
                        sortedCourses[course.grade] = [];
                    }
                    sortedCourses[course.grade].push(course);
                }
            });
            
            for (const key in sortedCourses) {
                sortedCourses[key].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
            }

            // 把对象转换成数组
            const sortedCoursesArray = [];
            for (const key in sortedCourses) {
                sortedCoursesArray.push({
                    grade: key,
                    courses: sortedCourses[key]
                });
            }

            sortedCoursesArray.sort((a, b) => b.grade.localeCompare(a.grade));

            // console.log(sortedCoursesArray);

            return sortedCoursesArray;
        },
    }
});

export default store;
