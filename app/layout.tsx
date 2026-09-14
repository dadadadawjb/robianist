import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Robo Piano — 机械奏鸣', description: '一场属于机器人的小小音乐会。双臂、灵巧手和实时钢琴声音。' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="zh-CN"><body>{children}</body></html>; }
