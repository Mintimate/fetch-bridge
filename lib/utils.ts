import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const shanghaiTimeZone = "Asia/Shanghai";

export function formatShanghaiDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeZone: shanghaiTimeZone,
  }).format(date);
}

export function formatShanghaiDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "medium",
    hourCycle: "h23",
    timeZone: shanghaiTimeZone,
  }).format(date);
}
