"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { disablePush, savePushSubscription } from "@/app/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushToggle({ initialEnabled, label = "Push мэдэгдэл авах" }: { initialEnabled: boolean; label?: string }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection must run in the browser
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration().then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setOn(!!sub && initialEnabled);
    });
  }, [initialEnabled]);

  async function toggle(next: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      if (next) {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMsg("Утасны тохиргооноос мэдэгдлийг зөвшөөрнө үү.");
          return;
        }
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
          }));
        await savePushSubscription(JSON.parse(JSON.stringify(sub)));
        setOn(true);
      } else {
        const sub = await reg.pushManager.getSubscription();
        await disablePush(sub?.endpoint ?? null);
        await sub?.unsubscribe();
        setOn(false);
      }
    } catch {
      setMsg("Мэдэгдэл тохируулж чадсангүй. iPhone дээр эхлээд сайтыг нүүр дэлгэцэндээ нэмнэ үү.");
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;
  if (!supported) {
    return <p className="text-sm text-muted-foreground">Энэ хөтөч push мэдэгдэл дэмжихгүй байна. iPhone дээр «Нүүр дэлгэцэнд нэмэх»-ээр суулгаад дахин оролдоно уу.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="flex min-h-11 items-center justify-between gap-3">
        <span className="font-medium">{label}</span>
        <Switch checked={on} disabled={busy} onCheckedChange={toggle} aria-label={label} className="scale-125" />
      </label>
      {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}
