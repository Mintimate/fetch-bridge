export function RouteResolutionFlow() {
  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-medium">下载请求 · 路由解析</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        仅 <code>/download/*</code> 走轻量 Worker；路径前缀匹配 Source 后解析目标路径，
        任一校验不通过即返回 400，上游异常返回 502。
      </p>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox="0 0 1340 400"
          className="h-auto w-full"
          style={{ minWidth: "1100px" }}
          role="img"
          aria-label="下载请求经轻量 Worker 做 D1 路由解析：源站校验、前缀匹配、目标路径校验三道关卡任一失败即返回 400（私网/DNS 重绑定、无对应路由、非法跨源跳转），全部通过后向上游拉取并流式返回，上游超时或异常走 502 分支。"
        >
          <defs>
            <marker
              id="rf-arrow"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#6B7280" />
            </marker>
            <marker
              id="rf-arrow-green"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#059669" />
            </marker>
            <marker
              id="rf-arrow-red"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#DC2626" />
            </marker>
            <marker
              id="rf-arrow-amber"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#D97706" />
            </marker>
            <marker
              id="rf-arrow-purple"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#7C3AED" />
            </marker>
            <marker
              id="rf-arrow-indigo"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#6366F1" />
            </marker>
            <marker
              id="rf-arrow-sky"
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 Z" fill="#0EA5E9" />
            </marker>
            <filter id="rf-shadow" x="-4%" y="-4%" width="108%" height="116%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="2"
                floodColor="#000"
                floodOpacity="0.08"
              />
            </filter>
          </defs>

          {/* main flow nodes */}
          <rect x="10" y="170" width="120" height="60" rx="8" fill="#F3F4F6" stroke="#9CA3AF" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="70" y="196" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="600">用户浏览器</text>
          <text x="70" y="213" textAnchor="middle" fill="#6B7280" fontSize="9">GET /download/...</text>

          <rect x="170" y="160" width="140" height="80" rx="8" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="240" y="188" textAnchor="middle" fill="#5B21B6" fontSize="12" fontWeight="600">轻量 Worker</text>
          <text x="240" y="203" textAnchor="middle" fill="#7C3AED" fontSize="9">免 Next.js / Prisma</text>
          <text x="240" y="217" textAnchor="middle" fill="#7C3AED" fontSize="9">边缘 PoP 响应</text>

          <rect x="360" y="160" width="140" height="80" rx="8" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="430" y="188" textAnchor="middle" fill="#1E40AF" fontSize="12" fontWeight="600">D1 路由解析</text>
          <text x="430" y="203" textAnchor="middle" fill="#2563EB" fontSize="9">前缀 → 源站</text>
          <text x="430" y="217" textAnchor="middle" fill="#2563EB" fontSize="9">+ 目标路径</text>

          <polygon points="510,200 570,160 630,200 570,240" fill="#FFF7ED" stroke="#F59E0B" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="570" y="196" textAnchor="middle" fill="#92400E" fontSize="11" fontWeight="600">源站校验</text>
          <text x="570" y="210" textAnchor="middle" fill="#B45309" fontSize="9">HTTPS + 公网 DNS</text>

          <polygon points="660,200 720,160 780,200 720,240" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="720" y="196" textAnchor="middle" fill="#4338CA" fontSize="11" fontWeight="600">前缀匹配</text>
          <text x="720" y="210" textAnchor="middle" fill="#4338CA" fontSize="9">pathPrefix/*</text>

          <polygon points="810,200 870,160 930,200 870,240" fill="#F0F9FF" stroke="#0EA5E9" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="870" y="196" textAnchor="middle" fill="#0369A1" fontSize="11" fontWeight="600">目标路径校验</text>
          <text x="870" y="210" textAnchor="middle" fill="#0284C7" fontSize="9">禁 .. / 跨源</text>

          <rect x="990" y="160" width="140" height="80" rx="8" fill="#EEF2FF" stroke="#6366F1" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="1060" y="188" textAnchor="middle" fill="#4338CA" fontSize="12" fontWeight="600">上游拉取</text>
          <text x="1060" y="203" textAnchor="middle" fill="#4338CA" fontSize="9">fetch 源站</text>
          <text x="1060" y="217" textAnchor="middle" fill="#4338CA" fontSize="9">带超时保护</text>

          <rect x="1170" y="160" width="150" height="80" rx="26" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="1245" y="188" textAnchor="middle" fill="#065F46" fontSize="12" fontWeight="600">流式返回 ✓</text>
          <text x="1245" y="203" textAnchor="middle" fill="#059669" fontSize="9">x-fetch-bridge-relay</text>
          <text x="1245" y="217" textAnchor="middle" fill="#059669" fontSize="9">轻量标记</text>

          {/* failure branches */}
          <rect x="500" y="300" width="150" height="56" rx="8" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="575" y="322" textAnchor="middle" fill="#991B1B" fontSize="11" fontWeight="600">校验失败 400</text>
          <text x="575" y="338" textAnchor="middle" fill="#BE123C" fontSize="9">私网 / DNS 重绑定</text>

          <rect x="650" y="300" width="160" height="56" rx="8" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="730" y="322" textAnchor="middle" fill="#991B1B" fontSize="11" fontWeight="600">前缀不匹配 400</text>
          <text x="730" y="338" textAnchor="middle" fill="#BE123C" fontSize="9">无对应路由</text>

          <rect x="795" y="300" width="150" height="56" rx="8" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="870" y="322" textAnchor="middle" fill="#991B1B" fontSize="11" fontWeight="600">目标非法 400</text>
          <text x="870" y="338" textAnchor="middle" fill="#BE123C" fontSize="9">.. / 跨源跳转</text>

          <rect x="985" y="300" width="150" height="56" rx="8" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="1060" y="322" textAnchor="middle" fill="#991B1B" fontSize="11" fontWeight="600">上游失败 502</text>
          <text x="1060" y="338" textAnchor="middle" fill="#BE123C" fontSize="9">超时 / 5xx</text>

          {/* success branch */}
          <rect x="1170" y="300" width="150" height="56" rx="8" fill="#ECFDF5" stroke="#059669" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="1245" y="322" textAnchor="middle" fill="#065F46" fontSize="11" fontWeight="600">响应直达用户</text>
          <text x="1245" y="338" textAnchor="middle" fill="#059669" fontSize="9">头过滤 / 不落盘</text>

          {/* effect chip */}
          <rect x="10" y="340" width="200" height="44" rx="8" fill="#F9FAFB" stroke="#9CA3AF" strokeWidth="1.5" filter="url(#rf-shadow)" />
          <text x="110" y="362" textAnchor="middle" fill="#6B7280" fontSize="10" fontWeight="600">边缘就近</text>
          <text x="110" y="376" textAnchor="middle" fill="#9CA3AF" fontSize="9">低延迟 · 安全加固</text>

          {/* dashed validation group */}
          <rect x="485" y="130" width="420" height="130" rx="12" fill="none" stroke="#94A3B8" strokeWidth="1" strokeDasharray="6,3" />
          <text x="695" y="148" textAnchor="middle" fill="#94A3B8" fontSize="9">请求校验（任一不通过即 400）</text>

          {/* main edges */}
          <line x1="130" y1="200" x2="166" y2="200" stroke="#6B7280" strokeWidth="1.5" markerEnd="url(#rf-arrow)" />
          <text x="148" y="192" textAnchor="middle" fill="#6B7280" fontSize="9">请求</text>

          <line x1="310" y1="200" x2="356" y2="200" stroke="#6366F1" strokeWidth="1.5" markerEnd="url(#rf-arrow-indigo)" />
          <text x="333" y="192" textAnchor="middle" fill="#6366F1" fontSize="9">匹配</text>

          <line x1="500" y1="200" x2="508" y2="200" stroke="#059669" strokeWidth="1.5" markerEnd="url(#rf-arrow-green)" />
          <text x="504" y="192" textAnchor="middle" fill="#059669" fontSize="9">解析出</text>

          <line x1="630" y1="200" x2="658" y2="200" stroke="#059669" strokeWidth="1.5" markerEnd="url(#rf-arrow-green)" />
          <text x="644" y="192" textAnchor="middle" fill="#059669" fontSize="9">通过</text>

          <line x1="780" y1="200" x2="808" y2="200" stroke="#059669" strokeWidth="1.5" markerEnd="url(#rf-arrow-green)" />
          <text x="794" y="192" textAnchor="middle" fill="#059669" fontSize="9">匹配</text>

          <line x1="930" y1="200" x2="988" y2="200" stroke="#059669" strokeWidth="1.5" markerEnd="url(#rf-arrow-green)" />
          <text x="959" y="192" textAnchor="middle" fill="#059669" fontSize="9">合法</text>

          <line x1="1130" y1="200" x2="1168" y2="200" stroke="#059669" strokeWidth="1.5" markerEnd="url(#rf-arrow-green)" />
          <text x="1149" y="192" textAnchor="middle" fill="#059669" fontSize="9">成功</text>

          {/* failure down edges */}
          <path d="M 570 240 Q 570 280 575 298" fill="none" stroke="#DC2626" strokeWidth="1.4" markerEnd="url(#rf-arrow-red)" />
          <text x="584" y="272" fill="#DC2626" fontSize="9">不合规</text>

          <path d="M 720 240 Q 720 280 725 298" fill="none" stroke="#DC2626" strokeWidth="1.4" markerEnd="url(#rf-arrow-red)" />
          <text x="734" y="272" fill="#DC2626" fontSize="9">无匹配</text>

          <path d="M 870 240 Q 870 280 870 298" fill="none" stroke="#DC2626" strokeWidth="1.4" markerEnd="url(#rf-arrow-red)" />
          <text x="880" y="272" fill="#DC2626" fontSize="9">非法</text>

          <path d="M 1060 240 Q 1060 280 1060 298" fill="none" stroke="#DC2626" strokeWidth="1.4" markerEnd="url(#rf-arrow-red)" />
          <text x="1074" y="272" fill="#DC2626" fontSize="9">异常</text>

          {/* success down edge */}
          <path d="M 1245 240 Q 1245 280 1245 298" fill="none" stroke="#059669" strokeWidth="1.4" markerEnd="url(#rf-arrow-green)" />
          <text x="1254" y="272" fill="#059669" fontSize="9">回填</text>

          {/* contrast: other paths go to Next.js main app */}
          <path d="M 240 160 Q 240 96 700 96 Q 700 150 810 158" fill="none" stroke="#9CA3AF" strokeWidth="1.2" strokeDasharray="4,3" markerEnd="url(#rf-arrow)" />
          <text x="430" y="86" textAnchor="middle" fill="#9CA3AF" fontSize="9">其他路径 → Next.js 主应用（加载完整框架）</text>
        </svg>
      </div>
    </section>
  );
}
