import type { xlsCourse, stagedCourse } from "./myInterface";

const xlsHeader = ['课程代码', '课程名称', '教师姓名']

// 接收一个课号数组，返回一个 xlsCourse 数组
export function codesToJsonForXLS(codes: string[], rawList: stagedCourse[]): xlsCourse[] {
    const ret: xlsCourse[] = [];

    for (const code of codes) {
        const course = rawList.find((course) => course.courseCode === code.substring(0, code.length - 2)); // 先找到这门课
        if (course) {
            const targetClass = course.courseDetail.find((detail) => detail.code === code); // 再找到班级
            if (targetClass) {
                const xlsCourse: xlsCourse = {
                    code: code,
                    courseName: course.courseNameReserved,
                    teacherName: course.teacher.map((teacher) => teacher.teacherName).join(',')
                };
                // console.log(xlsCourse);
                ret.push(xlsCourse);
            }
        }
    }

    return ret;
}

// 将 json 数据转换为 xlsx 文件
export async function jsonToXLS(jsonData: xlsCourse[]): Promise<Blob> {
    const XLSX: any = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([xlsHeader]);
    XLSX.utils.sheet_add_json(ws, jsonData, { origin: 1, skipHeader: true });
    ws['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 62.5 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
}

// 下载 xlsx 文件
export function downloadXLS(xlsData: Blob) {
    const url = window.URL.createObjectURL(xlsData); // 创建下载链接
    const a = document.createElement('a'); // 创建 a 标签
    a.download = '同济排课助手-辅助表.xlsx'; // 设置下载文件名
    a.href = URL.createObjectURL(xlsData); // 设置下载链接
    a.click(); // 模拟点击
    window.URL.revokeObjectURL(url); // 释放内存
}
