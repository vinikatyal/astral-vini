// components/lesson/LessonLoadingWidget.tsx
"use client";
import React, { useState, useEffect } from "react";

const funFacts = [
  "Did you know? The average person spends 6 months of their lifetime waiting for red lights to turn green! 🚦",
  "Fun fact: Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that's still edible! 🍯",
  "Interesting: A group of flamingos is called a 'flamboyance'! 🦩",
  "Cool fact: Octopuses have three hearts! 🐙",
  "Did you know? Bananas are berries, but strawberries aren't! 🍌",
  "Amazing: The shortest war in history lasted only 38-45 minutes! ⚔️",
  "Fun fact: A cloud can weigh more than a million pounds! ☁️",
  "Wow: Your brain uses 20% of your body's energy while being only 2% of your weight! 🧠",
];

export default function LessonLoadingWidget() {
  const [factIndex, setFactIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Rotate facts every 5 seconds
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % funFacts.length);
    }, 5000);

    // Simulate progress (0-90% only, never complete)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 3;
      });
    }, 500);

    return () => {
      clearInterval(factInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="mb-6 w-full animate-fadeIn rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50 p-6 shadow-lg">
      {/* Animated Icon and Title Row */}
      <div className="mb-4 flex items-center space-x-4">
        <div className="relative h-12 w-12 flex-shrink-0">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center text-xl">
            ✨
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-800">
            Generating Your Lesson
          </h3>
          <p className="text-sm text-gray-600">
            This may take a moment. Feel free to scroll around!
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-white/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Fun Facts */}
      <div className="rounded-lg bg-white/60 p-4 backdrop-blur-sm">
        <p className="text-center text-sm text-gray-700 transition-opacity duration-500">
          {funFacts[factIndex]}
        </p>
      </div>

      {/* Dots Animation */}
      <div className="mt-4 flex justify-center space-x-2">
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:0.2s]"></div>
        <div className="h-2 w-2 animate-bounce rounded-full bg-blue-600 [animation-delay:0.4s]"></div>
      </div>
    </div>
  );
}