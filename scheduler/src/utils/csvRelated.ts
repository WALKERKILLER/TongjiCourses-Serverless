import type { csvCourse, stagedCourse } from "./myInterface";
import Papa from 'papaparse';

const csvHeader = {
    courseName: '课程名称',
    occupyDay: '星期',
    start: '开始节数',
    end: '结束节数',
    teacherName: '老师',
    occupyRoom: '地点',
    occucpyWeek: '周数'
}

// 接收一个课号数组，返回一个 csvCourse 数组
export function codesToJsonForCSV(codes: string[], rawList: stagedCourse[]): csvCourse[] {
    const ret: csvCourse[] = [];

    ret.push(csvHeader);

    for (const code of codes) {
        const course = rawList.find((course) => course.courseCode === code.substring(0, code.length - 2)); // 先找到这门课
        if (course) {
            const targetClass = course.courseDetail.find((detail) => detail.code === code); // 再找到班级
            if (targetClass) {
                for (const arr of targetClass.arrangementInfo) {
                    const csvCourse: csvCourse = {
                        courseName: course.courseNameReserved,
                        occupyDay: arr.occupyDay,
                        start: arr.occupyTime[0],
                        end: arr.occupyTime.length == 1 ? arr.occupyTime[0] : arr.occupyTime[arr.occupyTime.length - 1],
                        teacherName: arr.teacherAndCode.split(',').map((str) => str.split('(')[0]).join(','), // 复旦的老师只有工号，是 1 系统的问题
                        occupyRoom: arr.occupyRoom,
                        occucpyWeek: arr.arrangementText.split(']')[0].split('[')[1]
                                    .split(' ').join('、')
                    };
                    // console.log(csvCourse);
                    ret.push(csvCourse);
                }
            }
        }
    }

    return ret;
}

export function downloadCSV(csvData: string) {
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob); // 创建下载链接
    const a = document.createElement('a'); // 创建 a 标签
    a.download = '同济排课助手-课程表.csv'; // 设置下载文件名
    a.href = URL.createObjectURL(blob); // 设置下载链接
    a.click(); // 模拟点击
    window.URL.revokeObjectURL(url); // 释放内存
}

export function jsonToCSV(jsonData: csvCourse[]): string {
    const csvData = Papa.unparse(jsonData, { header: false });
    return csvData;
}