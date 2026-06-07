# Railway Deployment Structure

Deploy this repository as three Railway services in one Railway project:

1. Backend service
2. Frontend service
3. MySQL database service

## Service Structure

```txt
specentra/
  backend/
    Dockerfile
    railway.toml
    .env.railway.example
    main.py
    requirements.txt
    app/

  frontend-build/
    Dockerfile
    Caddyfile
    railway.toml
    .env.railway.example
    package.json
    src/
```

## Backend Service

Railway service root directory:

```txt
backend
```

Railway will use `backend/Dockerfile`.

Attach a Railway Volume to the backend service:

```txt
/app/uploads
```

Set backend variables from:

```txt
backend/.env.railway.example
```

Health check:

```txt
/api/health
```

## Frontend Service

Railway service root directory:

```txt
frontend-build
```

Railway will use `frontend-build/Dockerfile`.

Set frontend variables from:

```txt
frontend-build/.env.railway.example
```

Health check:

```txt
/health
```

## MySQL Service

Add a MySQL database from Railway's project canvas.

Use the MySQL service variables in the backend `DATABASE_URL`:

```env
DATABASE_URL=mysql+pymysql://${{MySQL.MYSQLUSER}}:${{MySQL.MYSQLPASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}
```

## Deploy Order

1. Push this repo to GitHub.
2. Create a Railway project.
3. Add MySQL database.
4. Add backend service from GitHub with root directory `backend`.
5. Add a backend volume mounted at `/app/uploads`.
6. Add backend environment variables.
7. Generate backend public domain.
8. Add frontend service from GitHub with root directory `frontend-build`.
9. Add frontend environment variable `VITE_API_URL`.
10. Generate frontend public domain.
11. Update backend `ALLOWED_ORIGINS` with the frontend domain.
12. Update backend `PUBLIC_BACKEND_URL` with the backend domain.
13. Redeploy backend and frontend.

## Notes

- Do not commit local `.env`, `node_modules`, `dist`, or `backend/uploads`.
- Uploaded working papers persist only if the backend Railway Volume is mounted.
- Keep `DOCUMENT_EDITOR_URL` empty until you separately deploy or connect an ONLYOFFICE Document Server.
