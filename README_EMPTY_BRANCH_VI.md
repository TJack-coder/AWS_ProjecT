# Gói đầy đủ cho branch `develop_2.0` trống

Gói này chứa **toàn bộ file cần có trong branch**, gồm source frontend/backend, Dockerfile, cấu hình local, CloudWatch, cấu hình Elastic Beanstalk và GitHub Actions CI/CD.

## 1. Những file phải nằm ở root branch

```text
backend/
frontend/
.github/workflows/
deploy/beanstalk/
.ebextensions/
.platform/
cloudwatch/
aws/
docker-compose.yml
.env.example
.gitignore
README_EMPTY_BRANCH_VI.md
```

Không đưa `.env`, `node_modules`, `.venv`, `.git` hoặc AWS access key lên GitHub.

## 2. Upload vào branch trống

Giải nén ZIP. Upload **các file và thư mục bên trong** lên root của branch `develop_2.0`; không upload nguyên ZIP và không để thêm một thư mục cha bao ngoài.

Cách chắc chắn nhất trên Mac:

```bash
cd /duong-dan/toi/aws-library-empty-branch-ready

git init
git remote add origin https://github.com/TJack-coder/AWS_ProjecT.git
git checkout -b develop_2.0
git add .
git commit -m "init: add full AWS Library source and CI/CD"
git push -u origin develop_2.0
```

Nếu branch `develop_2.0` đã tồn tại trên GitHub nhưng đang trống, clone repository rồi copy toàn bộ nội dung gói vào thư mục clone, sau đó `git add`, `commit`, `push`.

## 3. Cấu hình AWS bằng tài khoản root đang đăng nhập

Trong AWS CloudShell, upload file:

```text
aws/setup-github-oidc.sh
```

Sau đó chạy:

```bash
chmod +x setup-github-oidc.sh
./setup-github-oidc.sh
```

Script sẽ:

- kiểm tra AWS account `521024927908` và Region `ap-southeast-2`;
- bảo đảm hai ECR repository tồn tại;
- cho Elastic Beanstalk quyền pull ECR;
- tạo GitHub OIDC provider;
- tạo/cập nhật role `aws-library-github-deploy`;
- cấp quyền push ECR, upload S3 và deploy Beanstalk;
- in ra `AWS_ROLE_ARN` và `EB_BUCKET`.

## 4. Tạo GitHub repository variables

Vào:

```text
Settings -> Secrets and variables -> Actions -> Variables
```

Tạo hai variable đúng theo kết quả script:

```text
AWS_ROLE_ARN
EB_BUCKET
```

Không tạo hoặc lưu root access key trong GitHub.

## 5. Chạy CI/CD

Vào:

```text
Actions -> Deploy AWS Library -> Run workflow
```

Workflow sẽ:

```text
kiểm tra source
-> build backend image
-> build frontend image
-> push hai image lên ECR bằng tag commit SHA
-> tạo ZIP Beanstalk
-> upload S3
-> tạo application version
-> deploy Aws-library-system-env
-> chờ Ready/Ok
-> gọi /health
```

Từ lần sau, mỗi lần push vào `develop_2.0`, workflow sẽ tự chạy.

## 6. Ý nghĩa hai file Compose

- `docker-compose.yml`: dùng source `backend/` và `frontend/` để build/chạy local.
- `deploy/beanstalk/docker-compose.template.yml`: dùng image đã push lên ECR; GitHub Actions thay `__IMAGE_TAG__` bằng commit SHA trước khi deploy.
