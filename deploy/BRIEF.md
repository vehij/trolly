# بریف استقرار «دردسرهای سوزن‌بان» روی دو سرور

> این متن برای یک جلسه‌ی Claude Code روی کامپیوتری است که به هر دو سرور دسترسی SSH دارد.
> کد آماده و تست‌شده است؛ کار این جلسه فقط **راه‌اندازی روی سرورها** است.

## هدف

یک بازی وب (Node.js، بدون هیچ وابستگی npm، دیتابیس SQLite داخلی Node) باید روی دو سرور مستقل بالا بیاید:

| | نسخه‌ی بین‌الملل | نسخه‌ی ایران |
|---|---|---|
| دامنه | `soozanban.com` (+ `www`) | `souzanbaan.ir` (+ `www`) |
| سرور | اروپا — `116.203.151.144`، SSH روی پورت `38787` | ایران — `62.60.211.199`، پورت `21` (کاربر گفته؛ اول بررسی کن واقعاً SSH است) |
| `REGION` | `intl` | `ir` |

- هر سرور مستقل کار می‌کند. سرور ایران هر ۵ دقیقه رأی‌ها را با سرور اروپا در هر دو جهت همگام می‌کند. اگر اینترنت بین‌الملل قطع شود، هر دو مستقل ادامه می‌دهند و بعد از وصل شدن، همگام‌سازی خودکار از جایی که مانده ادامه پیدا می‌کند.
- هر سرور کاربر کشور دیگر را، همراه با پیشرفت بازی‌اش، به نسخه‌ی مناسب هدایت می‌کند. این بخش در کد انجام شده و فقط به `.env` درست نیاز دارد.
- کد در `github.com/vehij/trolly` است، شاخه‌ی `claude/confident-brahmagupta-y2errr` (PR شماره‌ی ۱). اگر PR ادغام شده بود، از `main` استفاده کن. جزئیات کد در `README.md` آمده است.

## قوانین مهم (رعایت کن)

1. **روی هر دو سرور چند سایت وردپرسی فعال با cPanel وجود دارد. به آن‌ها دست نزن.** هیچ اکانت، دیتابیس، تنظیم PHP یا vhost موجودی را تغییر نده.
2. اول فقط **بررسی و گزارش** کن (بخش ۱)، بعد تغییر بده.
3. از هر فایل تنظیماتی که عوض می‌کنی قبلش نسخه‌ی پشتیبان بگیر (`cp file file.bak-$(date +%F)`).
4. دستورهای پرریسک ممنوع است: به‌روزرسانی کلی سیستم (`yum/dnf update`)، ریستارت کل سرور، تغییر firewall به‌جز موارد ذکرشده، و حذف هر چیزی که خودت نساخته‌ای.
5. Apache را فقط با `graceful` ری‌استارت کن، و فقط بعد از اینکه تست تنظیمات (`apachectl -t` یا `httpd -t`) بدون خطا رد شد.
6. **پیش از این کارها از کاربر تأیید بگیر:** ساخت اکانت cPanel، تغییر DNS نزد ثبت‌کننده‌ی دامنه (به دسترسی کاربر نیاز دارد)، هر تغییری در firewall.
7. `SYNC_SECRET` را جایی چاپ یا commit نکن. فقط در فایل `.env` روی دو سرور بماند (`chmod 600`).

## ۰. آماده‌سازی محلی (روی همین کامپیوتر)

```bash
git clone https://github.com/vehij/trolly.git soozanban && cd soozanban
git checkout claude/confident-brahmagupta-y2errr   # یا main اگر PR ادغام شده
node -v          # باید 22.13 یا بالاتر باشد
npm test         # باید ۱۱ تست سبز شود
openssl rand -hex 32   # SYNC_SECRET — یک بار بساز و برای هر دو سرور همان را استفاده کن
```

در `~/.ssh/config` دو میزبان تعریف کن (اگر از قبل نیست) تا اسکریپت‌ها ساده شوند:

```
Host soozanban-eu
  HostName 116.203.151.144
  Port 38787
  User root
Host soozanban-ir
  HostName 62.60.211.199
  Port 21
  User root
```

اگر دسترسی root نداری و فقط کاربر cPanel داری، به «حالت بدون root» در بخش ۴ نگاه کن.

## ۱. بررسی هر سرور (فقط خواندنی) و گزارش به کاربر

```bash
cat /etc/os-release; ldd --version | head -1          # نسخه‌ی glibc مهم است (پایین را ببین)
/usr/local/cpanel/cpanel -V                           # نسخه‌ی cPanel
whoami; id
ls /opt/cpanel/ | grep -i node; which node; node -v 2>/dev/null
httpd -v 2>/dev/null; ls /usr/local/lsws 2>/dev/null && echo LITESPEED
ss -ltnp | grep -E ':3700\b' || echo "port 3700 free"
csf -v 2>/dev/null && grep -E '^(TCP_IN|TCP_OUT) ' /etc/csf/csf.conf
which rsync
df -h /home
```

روی سرور ایران دسترسی خروجی را هم امتحان کن: `curl -sI https://github.com | head -1` و `curl -sI https://nodejs.org | head -1`. اگر این‌ها در دسترس نبود، همه‌ی فایل‌ها را از کامپیوتر محلی بفرست.

## ۲. دامنه و DNS

- **`soozanban.com`** ← رکورد A برای `@` و `www` به `116.203.151.144`. با `dig NS soozanban.com +short` ببین DNS کجاست.
  - اگر Cloudflare است، **پراکسی را خاموش کن (ابر خاکستری / DNS only).** کاربران ایرانی خودشان به نسخه‌ی ایران می‌روند و Cloudflare ممکن است درخواست‌های همگام‌سازیِ سرور ایران را چالش یا مسدود کند. اگر کاربر حتماً پراکسی Cloudflare را خواست: در `.env` سرور اروپا `TRUST_PROXY=cloudflare` بگذار، و برای `SYNC_PEER` یک زیردامنه‌ی بدون پراکسی بساز (مثلاً `sync.soozanban.com`، DNS only، به همان IP، با SSL).
- **`souzanbaan.ir`** ← رکورد A برای `@` و `www` به `62.60.211.199`.
  - **nameserverهای این دامنه باید داخل ایران باشند**: یا nameserverهای خود سرور cPanel ایران، یا یک DNS ایرانی مثل ابرآروان. نکته‌ی اصلی کل طرح همین است: در قطعی، DNS دامنه‌های `.ir` داخل ایران کار می‌کند.
  - با `dig NS souzanbaan.ir +short` بررسی کن و اگر لازم بود، به کاربر بگو در پنل ایرنیک چه nameserverهایی بگذارد.

## ۳. ساخت جای برنامه در cPanel

روی هر سرور یک **اکانت cPanel جدید و جدا** بساز (با تأیید کاربر)، به نام کاربری `soozanban` و دامنه‌ی همان سرور. این‌طوری کاملاً از سایت‌های وردپرسی جداست:

```bash
whmapi1 createacct username=soozanban domain=soozanban.com      # روی سرور اروپا
whmapi1 createacct username=soozanban domain=souzanbaan.ir      # روی سرور ایران
```

(اگر کاربر ترجیح داد، به‌جای اکانت جدید از Addon Domain یک اکانت موجود استفاده کن و `CPANEL_USER` را همان بگذار.)

گواهی SSL را با AutoSSL بگیر: `/usr/local/cpanel/bin/autossl_check --user=soozanban`.

> **هشدار SSL سرور ایران:** گواهی‌های AutoSSL حدوداً ۹۰ روزه‌اند و تمدیدشان به اینترنت بین‌الملل نیاز دارد. اگر قطعی طولانی شود و گواهی وسطش منقضی شود، نسخه‌ی ایران با خطای امنیتی باز می‌شود. به کاربر پیشنهاد بده برای `souzanbaan.ir` یک گواهی پولی با طولانی‌ترین اعتبار ممکن بخرد (در حال حاضر حداکثر حدود ۲۰۰ روز)، و تاریخ انقضا را هم پایش کند.

## ۴. نصب Node.js (نسخه‌ی 22.13 یا بالاتر)

ترتیب ترجیح:

1. اگر پکیج `ea-nodejs22` در cPanel هست یا نصب‌شدنی است، از `/opt/cpanel/ea-nodejs22/bin/node` استفاده کن.
2. در غیر این صورت، باینری رسمی را **روی کامپیوتر محلی** دانلود کن و بفرست. سرور ایران ممکن است به nodejs.org دسترسی نداشته باشد.
   ```bash
   V=v22.20.0   # یا جدیدترین 22.x
   # اگر glibc سرور ≥ 2.28 است:
   curl -O https://nodejs.org/dist/$V/node-$V-linux-x64.tar.xz
   # اگر glibc سرور 2.17 است (CentOS/CloudLinux 7)، باینری رسمی اجرا نمی‌شود؛ از ساخت غیررسمی استفاده کن:
   # curl -O https://unofficial-builds.nodejs.org/download/release/$V/node-$V-linux-x64-glibc-217.tar.xz
   scp node-$V-linux-x64*.tar.xz soozanban-ir:/tmp/
   ssh soozanban-ir "mkdir -p /opt/node22 && tar -xJf /tmp/node-$V-linux-x64*.tar.xz -C /opt/node22 --strip-components=1 && /opt/node22/bin/node -v"
   ```

هر جا در فایل‌ها `/opt/node22/bin/node` آمده، با مسیر واقعی Node جایگزینش کن.

**حالت بدون root:** اگر root نداری، از «Setup Node.js App» در cPanel (Passenger) استفاده کن. پوشه‌ی برنامه `soozanban`، فایل شروع `server/index.js`، و متغیرهای `.env` را در همان صفحه وارد کن. Passenger پورت را خودش مدیریت می‌کند، پس بخش‌های ۶ و ۷ لازم نیست. فقط نسخه‌ی Node باید ≥ 22.13 باشد.

## ۵. انتقال کد و تنظیمات

روی هر سرور:

```bash
mkdir -p /home/soozanban/soozanban /home/soozanban/soozanban-data
chown -R soozanban:soozanban /home/soozanban/soozanban /home/soozanban/soozanban-data
```

از کامپیوتر محلی کد را بفرست (`rsync`؛ اگر روی سرور نبود از `scp -r` یا `tar | ssh` استفاده کن):

```bash
rsync -az --exclude .git --exclude data --exclude .env --exclude test ./ soozanban-eu:/home/soozanban/soozanban/
rsync -az --exclude .git --exclude data --exclude .env --exclude test ./ soozanban-ir:/home/soozanban/soozanban/
```

فایل `.env` را از روی نمونه‌ها بساز. `CPANEL_USER` را با `soozanban` و `SYNC_SECRET` را با کلید ساخته‌شده جایگزین کن:
- سرور اروپا ← `deploy/env.intl.example` به `/home/soozanban/soozanban/.env`
- سرور ایران ← `deploy/env.ir.example` به `/home/soozanban/soozanban/.env`

```bash
chown soozanban:soozanban /home/soozanban/soozanban/.env && chmod 600 /home/soozanban/soozanban/.env
```

اگر پورت 3700 گرفته بود، پورت آزاد دیگری انتخاب کن و آن را در `.env`، `apache-proxy.conf` و `deploy.sh` یکسان کن.

## ۶. سرویس systemd

`deploy/soozanban.service` را با جایگزینی `CPANEL_USER` و مسیر Node در `/etc/systemd/system/soozanban.service` بگذار:

```bash
systemctl daemon-reload && systemctl enable --now soozanban
systemctl status soozanban --no-pager
curl -s http://127.0.0.1:3700/healthz      # {"ok":true,"region":"intl"} یا "ir"
journalctl -u soozanban -n 30 --no-pager
```

## ۷. پراکسی Apache/LiteSpeed در cPanel

`deploy/apache-proxy.conf` را در **هر دو** مسیر زیر بگذار (`DOMAIN` همان دامنه‌ی آن سرور است):

```
/etc/apache2/conf.d/userdata/std/2_4/soozanban/DOMAIN/soozanban.conf
/etc/apache2/conf.d/userdata/ssl/2_4/soozanban/DOMAIN/soozanban.conf
```

```bash
/scripts/rebuildhttpdconf && apachectl -t && /scripts/restartsrv_httpd --graceful
# اگر LiteSpeed است: /usr/local/lsws/bin/lswsctrl restart (graceful است)
```

بعد از این کار بررسی کن که **چند سایت وردپرسی موجود هنوز سالم باز می‌شوند** (`curl -sI https://<یکی از سایت‌ها>`).

اگر `www` هم وصل است، بهتر است با یک ریدایرکت 301 به دامنه‌ی اصلی بدون `www` برود. این کار از «Redirects» در cPanel اکانت `soozanban` انجام می‌شود.

## ۸. پشتیبان‌گیری روزانه

با `crontab -u soozanban -e` روی هر دو سرور:

```
15 3 * * * cd /home/soozanban/soozanban && /opt/node22/bin/node --disable-warning=ExperimentalWarning scripts/backup.js >> /home/soozanban/soozanban-data/backup.log 2>&1
```

۱۴ نسخه‌ی آخر در `/home/soozanban/soozanban-data/backups/` نگه داشته می‌شود.

## ۹. آزمون نهایی (همه باید درست باشد، بعد به کاربر گزارش بده)

```bash
# ۱) هر دو سایت باز می‌شوند، فونت و صفحه سالم است
curl -sI https://soozanban.com | head -1;  curl -sI https://souzanbaan.ir | head -1
curl -s https://soozanban.com/healthz;     curl -s https://souzanbaan.ir/healthz

# ۲) تشخیص کشور: از خود سرور ایران، نسخه‌ی بین‌الملل باید نسخه‌ی ایران را پیشنهاد کند
ssh soozanban-ir 'curl -s https://soozanban.com/api/whereami'
#    → "country":"IR", "suggest":"https://souzanbaan.ir"
ssh soozanban-eu 'curl -s https://souzanbaan.ir/api/whereami'
#    → "country":"other", "suggest":"https://soozanban.com"

# ۳) همگام‌سازی: یک دور دستی از سرور ایران
ssh soozanban-ir 'cd /home/soozanban/soozanban && sudo -u soozanban /opt/node22/bin/node --disable-warning=ExperimentalWarning server/sync.js'
#    → "ok": true
# وضعیت (کلید را از .env بخوان، چاپ نکن):
ssh soozanban-ir 'cd /home/soozanban/soozanban && S=$(grep ^SYNC_SECRET= .env | cut -d= -f2) && curl -s -H "Authorization: Bearer $S" http://127.0.0.1:3700/api/sync/status'

# ۴) آزمون واقعی: روی هر سایت یک مرحله بازی کن (یک رأی)، ۵ دقیقه صبر کن، و ببین /api/stats دو سایت یکی شده است
curl -s https://soozanban.com/api/stats; echo; curl -s https://souzanbaan.ir/api/stats
```

اگر همگام‌سازی خطا داد، `journalctl -u soozanban -n 50` روی سرور ایران را ببین. علت‌های رایج:
- `401`: `SYNC_SECRET` دو سرور یکی نیست.
- خطای اتصال یا timeout: فایروال (CSF) خروجی 443 را در سرور ایران یا ورودی 443 را در سرور اروپا بسته است، یا Cloudflare درخواست را چالش کرده (بخش ۲).

## ۱۰. انتشار نسخه‌های بعدی

از کامپیوتر محلی، بعد از `git pull`:

```bash
deploy/deploy.sh soozanban-eu soozanban
deploy/deploy.sh soozanban-ir soozanban
```

این اسکریپت اول تست‌ها را اجرا می‌کند، بعد کد را با `rsync` می‌فرستد (به `.env` و داده‌ها دست نمی‌زند) و سرویس را ری‌استارت می‌کند. سرور برای این کار به گیت‌هاب یا اینترنت نیاز ندارد.

## ۱۱. رفتار در زمان قطعی اینترنت بین‌الملل (برای اطلاع کاربر)

- کاربران داخل ایران با `souzanbaan.ir` بازی می‌کنند. کاربران خارج با `soozanban.com`.
- هر سرور فقط آمار رأی‌های خودش را نشان می‌دهد. رأی‌ها از دست نمی‌روند.
- لاگ سرور ایران هر ۵ دقیقه خطای همگام‌سازی نشان می‌دهد. **این طبیعی است و کاری لازم نیست.**
- بعد از وصل شدن اینترنت، اولین دور همگام‌سازی (حداکثر ۵ دقیقه بعد) همه‌ی رأی‌ها را در هر دو جهت ادغام می‌کند. برای اجرای فوری، دستور بخش ۹-۳ را بزن.
- فهرست IP ایران (`server/geo/`) هر چند ماه یک بار با `npm run update-geo` روی کامپیوتر محلی به‌روز و منتشر شود.

## گزارش پایانی به کاربر

در پایان این موارد را گزارش کن:
- وضعیت هر بند بخش ۹ (موفق یا ناموفق، با خروجی کوتاه).
- مسیر نصب Node و نسخه‌اش روی هر سرور.
- nameserverهای `souzanbaan.ir` و وضعیت پراکسی Cloudflare برای `soozanban.com`.
- تاریخ انقضای گواهی SSL هر دو دامنه.
- هر کاری که به تصمیم یا دسترسی کاربر نیاز دارد و انجام نشد.
