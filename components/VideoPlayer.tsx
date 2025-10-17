"use client";
import { useRef } from "react";

type Props = { src: string; captionsVttUrl?: string };
export default function VideoPlayer({ src, captionsVttUrl }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="overflow-hidden rounded-xl border bg-black">
      <video ref={ref} controls preload="metadata" className="w-full" playsInline>
        {/* No autoplay */}
        {captionsVttUrl && (
          <track label="English" kind="captions" srcLang="en" src={captionsVttUrl} default />
        )}
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
