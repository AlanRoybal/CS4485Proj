import type { Metadata } from "next";
import { Gilda_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const gildaDisplay = Gilda_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gilda",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "Zipcast — Dallas Real Estate Market Analyzer",
  description:
    "ML-powered home price forecasts for 113 Dallas-area zipcodes. Data-backed insights using Zillow ZHVI data and XGBoost predictions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${gildaDisplay.variable} ${dmSans.variable} antialiased`}
      >
        <NavBar />
        {children}
      </body>
    </html>
  );
}
