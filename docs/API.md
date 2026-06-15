# API Specification - Sprint 0

Base URL local: `http://localhost:5000`

## Health Check

```http
GET /health
```

## Books CRUD

```http
GET /books
GET /books/{id}
POST /books
PUT /books/{id}
DELETE /books/{id}
```

### Create book body

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "category": "Programming",
  "description": "A handbook of agile software craftsmanship."
}
```

## Borrow book

```http
POST /borrow
```

```json
{
  "book_id": 1,
  "user_id": "U001"
}
```

## Return book

```http
POST /return
```

```json
{
  "book_id": 1,
  "user_id": "U001"
}
```

## Borrow records

```http
GET /borrow-records
```
