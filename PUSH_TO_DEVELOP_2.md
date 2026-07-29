# Push lên `develop_2.0` và auto deploy

Đứng trong repository Git đã clone:

```bash
git switch develop_2.0
git pull --rebase origin develop_2.0
```

Xóa source cũ nhưng giữ `.git`, rồi copy nội dung thư mục ZIP đã giải nén vào repository. Sau đó:

```bash
find . -type f -name "*.sh" -exec chmod +x {} \;
find . -name ".DS_Store" -delete
python3 -m compileall -q backend
git add -A
git commit -m "feat: deploy CloudLibrary Professional V3"
git push origin develop_2.0
```

GitHub cần hai repository Variables:

```text
AWS_ROLE_ARN
EB_BUCKET
```

Sau khi push, theo dõi `CI` và `Deploy AWS Library` trong GitHub Actions.
