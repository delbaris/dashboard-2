
## داده‌های Demo

تمام داده‌های نمونه در `data.js` و درون `window.DEMO_DATA` قرار دارند:

- `employees` — ۱۲ نفر (تهران + دبی)
- `projects` — ۶ پروژه با وضعیت‌های مختلف
- `tasks` — ۲۶ تسک در پروژه‌ها
- `candidates` — ۸ کاندید
- `interviews` — ۸ مصاحبه
- `assignments` — ۲۲ تخصیص چندپروژه‌ای
- `timeEntries` — به‌صورت برنامه‌نویسی‌شده از assignments ساخته می‌شود
- `users` — ۴ کاربر با نقش‌های متفاوت
- `auditLog` — چند رویداد اولیه

## محاسبه KPI

هیچ عددی Hard-code نشده است. همه KPIها از داده‌ها محاسبه می‌شوند:

| KPI | فرمول |
|-----|-------|
| کارکنان فعال | `employees.filter(status in [Active, Onboarding])` |
| پروژه‌های فعال | `projects.filter(status != Completed)` |
| آماده تخصیص | کارکنان با تخصیص < ۸۰٪ |
| ظرفیت مصرف‌شده | میانگین مجموع تخصیص کارکنان فعال |
| ساعات تأییدشده | `timeEntries.filter(Approved).sum(hours)` |
| ارزش پرتفوی | `projects.sum(financialBudget)` |
| هزینه واقعی | `Approved hours × hourlyCost` برای هر کارمند |

## هشدارها (Derived)

هشدارها به‌صورت Rule-based از داده‌ها تولید می‌شوند (نه متن ثابت):

1. مصرف زمان > پیشرفت + آستانه
2. عبور از مهلت پروژه
3. ریسک بودجه
4. پروژه بدون تسک فعال
5. کارمند Overallocated

آستانه‌ها در `Settings → آستانه هشدارها` قابل تنظیم هستند.

## مدیریت کارت‌های داشبورد

از طریق `Dashboard → مدیریت کارت‌ها` یا `Settings`:

- نمایش/عدم نمایش کارت
- تغییر عنوان، متریک، آیکون، فرمت، نوع نمودار
- تغییر ترتیب با Drag & Drop
- افزودن و حذف کارت
- بازگردانی پیش‌فرض

ساختار هر کارت:

```js
{
  id, title, metric, visible, order,
  chartType, chartVisible, icon, format,
  comparePeriod, drilldown, color
}