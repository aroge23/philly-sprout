"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface CameraPermissionLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function CameraPermissionLink({ href, children, className }: CameraPermissionLinkProps) {
  const router = useRouter();
  const [isRequesting, setIsRequesting] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch {
      // Permission denied or unsupported — still navigate; user can use file input
    } finally {
      setIsRequesting(false);
      router.push(href);
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
