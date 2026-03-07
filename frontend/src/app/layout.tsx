import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Academix — The Ultimate Academic OS",
    template: "%s | Academix",
  },
  description:
    "Combine your academic planner, campus community, library, forums, and AI-powered study tools into one powerful platform. Upload notes, generate quizzes, track progress, and connect with peers.",
  keywords: [
    "academic planner", "study platform", "campus community", "AI study tools",
    "notes sharing", "quiz generator", "flashcards", "student collaboration",
    "leaderboard", "gamification", "library", "forums",
  ],
  authors: [{ name: "Academix Team" }],
  creator: "Academix",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Academix",
    title: "Academix — The Ultimate Academic OS",
    description: "Upload notes, generate AI quizzes, collaborate with peers, and level up your academic journey.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Academix — The Ultimate Academic OS",
    description: "The all-in-one academic platform for students.",
  },
  other: {
    "theme-color": "#0a0e1a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
