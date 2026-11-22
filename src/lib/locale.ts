/** Vietnamese formatting for dates and numbers shown in the interface. */
export const LOCALE = "vi-VN";

const WEEKDAYS = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
/** Column labels for calendars, Sunday first. */
export const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export const weekday = (d: Date) => WEEKDAYS[d.getDay()];
/** "22 tháng 11" */
export const dayMonth = (d: Date) => `${d.getDate()} tháng ${d.getMonth() + 1}`;
/** "22/11" */
export const dayMonthShort = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
export const num = (n: number) => n.toLocaleString(LOCALE);
