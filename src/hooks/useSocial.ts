"use client";

import { useCallback } from "react";
import { absoluteUrl } from "@/lib/utils/format";

export interface SocialLink {
  label: string;
  icon: string;
  color: string;
  href: string;
}

export interface ShareOptions {
  url: string;
  title?: string;
  description?: string;
}

/**
 * Comprehensive social sharing hook
 * Provides social media links, QR code generation, and clipboard functionality
 */
export function useSocial() {
  const generateSocialLinks = useCallback(({ url, title = "Check out this document on getpidief", description = "" }: ShareOptions): SocialLink[] => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    return [
      {
        label: "WhatsApp",
        icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
        color: "#25D366",
        href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      },
      {
        label: "Telegram",
        icon: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg",
        color: "#0088cc",
        href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      },
      {
        label: "Twitter/X",
        icon: "https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_original.svg",
        color: "#000000",
        href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}${description ? `&via=getpidief` : ""}`,
      },
      {
        label: "LinkedIn",
        icon: "https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png",
        color: "#0077B5",
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedDescription}`,
      },
      {
        label: "Facebook",
        icon: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
        color: "#1877F2",
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
      },
      {
        label: "Reddit",
        icon: "https://upload.wikimedia.org/wikipedia/commons/5/55/Reddit_logo.svg",
        color: "#FF4500",
        href: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      },
      {
        label: "Email",
        icon: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Gmail_Icon.png",
        color: "#EA4335",
        href: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
      },
    ];
  }, []);

  const generateQRCode = useCallback(async (url: string, options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }): Promise<string | null> => {
    try {
      const QRCode = await import("qrcode");
      return await QRCode.toDataURL(url, {
        width: options?.size || 220,
        margin: options?.margin || 2,
        color: {
          dark: options?.darkColor || "#F1F5F9",
          light: options?.lightColor || "#111D3A",
        },
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      return null;
    }
  }, []);

  const shareToClipboard = useCallback(async ({ url, title }: ShareOptions): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const el = document.createElement("textarea");
        el.value = `${title}\n${url}`;
        el.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(el);
        el.select();
        const success = document.execCommand("copy");
        document.body.removeChild(el);
        return success;
      } catch {
        return false;
      }
    }
  }, []);

  const shareToNative = useCallback(async ({ url, title }: ShareOptions): Promise<boolean> => {
    if (!navigator.share) return false;

    try {
      await navigator.share({
        title,
        text: `Check out this document on getpidief`,
        url,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const generateShareText = useCallback((item: {
    title?: string;
    author?: string;
    type?: string;
    count?: number;
  }): string => {
    const { title, author, type = "document", count } = item;
    
    let shareText = "";
    
    if (title) {
      shareText += `${title}`;
    }
    
    if (author) {
      shareText += ` by ${author}`;
    }
    
    if (count) {
      shareText += ` (${count} ${type}${count !== 1 ? 's' : ''})`;
    }
    
    shareText += ` on getpidief`;
    
    return shareText;
  }, []);

  return {
    generateSocialLinks,
    generateQRCode,
    shareToClipboard,
    shareToNative,
    generateShareText,
  };
}
