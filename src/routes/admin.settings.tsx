import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/hooks/useApp";
import { hasPermission } from "@/lib/auth/permissions";
import {
  DEFAULT_MODERATION_SETTINGS,
  getModerationSettings,
  updateModerationSettings,
  type ModerationSettings,
} from "@/lib/firebase/settings";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "إعدادات الموافقة | عجلات الجزائر" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { user } = useApp();
  const canEdit = !!user && hasPermission(user, "system:settings");
  const [settings, setSettings] = useState<ModerationSettings>(DEFAULT_MODERATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof ModerationSettings | null>(null);

  useEffect(() => {
    let active = true;
    getModerationSettings()
      .then((next) => {
        if (active) setSettings(next);
      })
      .catch(() => {
        toast.error("تعذّر تحميل الإعدادات");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async (key: keyof ModerationSettings, value: boolean) => {
    if (!canEdit) return;
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSavingKey(key);
    try {
      await updateModerationSettings(next);
      toast.success("تم حفظ الإعداد");
    } catch (err: unknown) {
      setSettings(previous);
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ الإعداد");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black">إعدادات الموافقة</h2>
        <p className="text-sm text-muted-foreground">
          تحكم في ما إذا كانت الإعلانات والتقييمات الجديدة تحتاج مراجعة الإدارة قبل الظهور.
        </p>
        {!canEdit && (
          <p className="mt-2 text-sm text-muted-foreground">المشاهدة فقط — التعديل متاح للمدير.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>موافقة الإعلانات</CardTitle>
          <CardDescription>
            عند التفعيل، الإعلانات الجديدة تبقى قيد المراجعة حتى تعتمدها الإدارة. عند الإيقاف تُنشر فوراً.
            الإعلانات المعلّقة سابقاً لا تتغيّر تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="listings-approval" className="text-sm font-semibold">
              طلب موافقة الإدارة على الإعلانات
            </Label>
            <Switch
              id="listings-approval"
              checked={settings.listingsRequireApproval}
              disabled={!canEdit || savingKey === "listingsRequireApproval"}
              onCheckedChange={(checked) => void save("listingsRequireApproval", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>موافقة التقييمات</CardTitle>
          <CardDescription>
            عند التفعيل، التقييمات الجديدة لا تظهر للزوار حتى تعتمدها الإدارة. عند الإيقاف تُنشر فوراً.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="reviews-approval" className="text-sm font-semibold">
              طلب موافقة الإدارة على التقييمات
            </Label>
            <Switch
              id="reviews-approval"
              checked={settings.reviewsRequireApproval}
              disabled={!canEdit || savingKey === "reviewsRequireApproval"}
              onCheckedChange={(checked) => void save("reviewsRequireApproval", checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
