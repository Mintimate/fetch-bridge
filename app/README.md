# App Router

页面默认使用 Server Components。`download/[...path]` 是唯一的下载入口，严格从数据库路由解析目标 URL，绝不读取 query string 中的 URL。
