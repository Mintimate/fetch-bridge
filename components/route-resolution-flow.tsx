/**
 * 下载请求路由解析流程图。
 *
 * 布局约定（网格化坐标，避免手写错位）：
 * - 主流程 8 个节点：宽 140、高 80、y=160，间隙 50，中心 y=200
 * - 失败/成功分支：宽 150、高 60、y=300，与上方节点中心严格对齐
 * - 校验组虚线框包住「源站校验 / 前缀匹配 / 目标路径校验」三个节点
 * - 顶部灰色分支：非 /download/* 路径进入 Next.js 主应用
 */

const NODE_W = 140;
const NODE_H = 80;
const NODE_Y = 160;
const NODE_CY = NODE_Y + NODE_H / 2; // 200
const GAP = 50;

// 主流程 8 个节点的左缘 x：20, 210, 400, 590, 780, 970, 1160, 1350
const xs = Array.from({ length: 8 }, (_, i) => 20 + i * (NODE_W + GAP));
const centers = xs.map((x) => x + NODE_W / 2);

const BRANCH_H = 60;
const BRANCH_Y = 300;
const BRANCH_W = 150;

function BranchRect({ center, y = BRANCH_Y }: { center: number; y?: number }) {
  return { x: center - BRANCH_W / 2, y };
}

const fail1 = BranchRect({ center: centers[3] });
const fail2 = BranchRect({ center: centers[4] });
const fail3 = BranchRect({ center: centers[5] });
const fail4 = BranchRect({ center: centers[6] });
const pass = BranchRect({ center: centers[7] });

export function RouteResolutionFlow() {
  return (
    <section className="rounded-lg border p-5">
      <h2 className="font-medium">下载请求 · 路由解析</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        仅 <code>/download/*</code> 走轻量 Worker；路径前缀匹配 Source
        后解析目标路径， 任一校验不通过即返回 400，上游异常返回 502。
      </p>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox="0 0 1510 400"
          className="h-auto w-full"
          style={{ minWidth: "1150px" }}
          role="img"
          aria-label="下载请求经轻量 Worker 做 D1 路由解析：源站校验、前缀匹配、目标路径校验三道关卡任一失败即返回 400（私网/DNS 重绑定、无对应路由、非法跨源跳转），全部通过后向上游拉取并流式返回，上游超时或异常走 502 分支；非 /download/* 路径进入 Next.js 主应用。"
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

          {/* 校验组虚线框：包住源站校验 / 前缀匹配 / 目标路径校验（x 590~1110） */}
          <rect
            x="570"
            y="130"
            width="560"
            height="140"
            rx="12"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="6,3"
          />
          <text x="850" y="148" textAnchor="middle" fill="#94A3B8" fontSize="9">
            请求校验（任一不通过即 400）
          </text>

          {/* 顶部对比分支：非 /download/* 路径 → Next.js 主应用 */}
          <rect
            x="260"
            y="40"
            width="180"
            height="52"
            rx="8"
            fill="#F9FAFB"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x="350"
            y="62"
            textAnchor="middle"
            fill="#4B5563"
            fontSize="11"
            fontWeight="600"
          >
            Next.js 主应用
          </text>
          <text x="350" y="78" textAnchor="middle" fill="#9CA3AF" fontSize="9">
            其他路径 · 完整框架
          </text>
          <path
            d="M 90 160 L 90 66 L 254 66"
            fill="none"
            stroke="#9CA3AF"
            strokeWidth="1.2"
            strokeDasharray="4,3"
            markerEnd="url(#rf-arrow)"
          />
          <text x="171" y="56" textAnchor="middle" fill="#9CA3AF" fontSize="9">
            非 /download/*
          </text>

          {/* 主流程节点 */}
          <rect
            x={xs[0]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#F3F4F6"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[0]}
            y="192"
            textAnchor="middle"
            fill="#374151"
            fontSize="12"
            fontWeight="600"
          >
            用户浏览器
          </text>
          <text
            x={centers[0]}
            y="207"
            textAnchor="middle"
            fill="#6B7280"
            fontSize="9"
          >
            GET /download/...
          </text>

          <rect
            x={xs[1]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#F5F3FF"
            stroke="#7C3AED"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[1]}
            y="192"
            textAnchor="middle"
            fill="#5B21B6"
            fontSize="12"
            fontWeight="600"
          >
            轻量 Worker
          </text>
          <text
            x={centers[1]}
            y="207"
            textAnchor="middle"
            fill="#7C3AED"
            fontSize="9"
          >
            免 Next.js / Prisma
          </text>
          <text
            x={centers[1]}
            y="221"
            textAnchor="middle"
            fill="#7C3AED"
            fontSize="9"
          >
            边缘 PoP 响应
          </text>

          <rect
            x={xs[2]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#EFF6FF"
            stroke="#3B82F6"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[2]}
            y="192"
            textAnchor="middle"
            fill="#1E40AF"
            fontSize="12"
            fontWeight="600"
          >
            D1 路由解析
          </text>
          <text
            x={centers[2]}
            y="207"
            textAnchor="middle"
            fill="#2563EB"
            fontSize="9"
          >
            前缀 → 源站
          </text>
          <text
            x={centers[2]}
            y="221"
            textAnchor="middle"
            fill="#2563EB"
            fontSize="9"
          >
            + 目标路径
          </text>

          <rect
            x={xs[3]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#FFF7ED"
            stroke="#F59E0B"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[3]}
            y="192"
            textAnchor="middle"
            fill="#92400E"
            fontSize="12"
            fontWeight="600"
          >
            源站校验
          </text>
          <text
            x={centers[3]}
            y="207"
            textAnchor="middle"
            fill="#B45309"
            fontSize="9"
          >
            HTTPS + 公网 DNS
          </text>
          <text
            x={centers[3]}
            y="221"
            textAnchor="middle"
            fill="#B45309"
            fontSize="9"
          >
            拒绝私网 IP
          </text>

          <rect
            x={xs[4]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#EEF2FF"
            stroke="#6366F1"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[4]}
            y="192"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="12"
            fontWeight="600"
          >
            前缀匹配
          </text>
          <text
            x={centers[4]}
            y="207"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="9"
          >
            pathPrefix/*
          </text>
          <text
            x={centers[4]}
            y="221"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="9"
          >
            命中已启用路由
          </text>

          <rect
            x={xs[5]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#F0F9FF"
            stroke="#0EA5E9"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[5]}
            y="192"
            textAnchor="middle"
            fill="#0369A1"
            fontSize="12"
            fontWeight="600"
          >
            目标路径校验
          </text>
          <text
            x={centers[5]}
            y="207"
            textAnchor="middle"
            fill="#0284C7"
            fontSize="9"
          >
            禁 .. / 跨源
          </text>
          <text
            x={centers[5]}
            y="221"
            textAnchor="middle"
            fill="#0284C7"
            fontSize="9"
          >
            重定向逐跳校验
          </text>

          <rect
            x={xs[6]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#EEF2FF"
            stroke="#6366F1"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[6]}
            y="192"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="12"
            fontWeight="600"
          >
            上游拉取
          </text>
          <text
            x={centers[6]}
            y="207"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="9"
          >
            fetch 源站
          </text>
          <text
            x={centers[6]}
            y="221"
            textAnchor="middle"
            fill="#4338CA"
            fontSize="9"
          >
            带超时保护
          </text>

          <rect
            x={xs[7]}
            y={NODE_Y}
            width={NODE_W}
            height={NODE_H}
            rx="8"
            fill="#ECFDF5"
            stroke="#059669"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[7]}
            y="192"
            textAnchor="middle"
            fill="#065F46"
            fontSize="12"
            fontWeight="600"
          >
            流式返回 ✓
          </text>
          <text
            x={centers[7]}
            y="207"
            textAnchor="middle"
            fill="#059669"
            fontSize="9"
          >
            x-fetch-bridge-relay
          </text>
          <text
            x={centers[7]}
            y="221"
            textAnchor="middle"
            fill="#059669"
            fontSize="9"
          >
            轻量标记
          </text>

          {/* 主流程连线（间隙 50，箭头预留 4px） */}
          {[
            { i: 0, label: "请求", color: "#6B7280", marker: "rf-arrow" },
            {
              i: 1,
              label: "匹配",
              color: "#6366F1",
              marker: "rf-arrow-indigo",
            },
            {
              i: 2,
              label: "解析出",
              color: "#059669",
              marker: "rf-arrow-green",
            },
            { i: 3, label: "通过", color: "#059669", marker: "rf-arrow-green" },
            { i: 4, label: "匹配", color: "#059669", marker: "rf-arrow-green" },
            { i: 5, label: "合法", color: "#059669", marker: "rf-arrow-green" },
            { i: 6, label: "成功", color: "#059669", marker: "rf-arrow-green" },
          ].map(({ i, label, color, marker }) => (
            <g key={i}>
              <line
                x1={xs[i] + NODE_W}
                y1={NODE_CY}
                x2={xs[i + 1] - 4}
                y2={NODE_CY}
                stroke={color}
                strokeWidth="1.5"
                markerEnd={`url(#${marker})`}
              />
              <text
                x={(xs[i] + NODE_W + xs[i + 1]) / 2}
                y="192"
                textAnchor="middle"
                fill={color}
                fontSize="9"
              >
                {label}
              </text>
            </g>
          ))}

          {/* 失败分支（与上方节点中心对齐，等距不重叠） */}
          <rect
            x={fail1.x}
            y={fail1.y}
            width={BRANCH_W}
            height={BRANCH_H}
            rx="8"
            fill="#FEF2F2"
            stroke="#DC2626"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[3]}
            y="324"
            textAnchor="middle"
            fill="#991B1B"
            fontSize="11"
            fontWeight="600"
          >
            源站不合规 400
          </text>
          <text
            x={centers[3]}
            y="341"
            textAnchor="middle"
            fill="#BE123C"
            fontSize="9"
          >
            私网 / DNS 重绑定
          </text>

          <rect
            x={fail2.x}
            y={fail2.y}
            width={BRANCH_W}
            height={BRANCH_H}
            rx="8"
            fill="#FEF2F2"
            stroke="#DC2626"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[4]}
            y="324"
            textAnchor="middle"
            fill="#991B1B"
            fontSize="11"
            fontWeight="600"
          >
            前缀不匹配 400
          </text>
          <text
            x={centers[4]}
            y="341"
            textAnchor="middle"
            fill="#BE123C"
            fontSize="9"
          >
            无对应路由
          </text>

          <rect
            x={fail3.x}
            y={fail3.y}
            width={BRANCH_W}
            height={BRANCH_H}
            rx="8"
            fill="#FEF2F2"
            stroke="#DC2626"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[5]}
            y="324"
            textAnchor="middle"
            fill="#991B1B"
            fontSize="11"
            fontWeight="600"
          >
            目标非法 400
          </text>
          <text
            x={centers[5]}
            y="341"
            textAnchor="middle"
            fill="#BE123C"
            fontSize="9"
          >
            .. / 跨源跳转
          </text>

          <rect
            x={fail4.x}
            y={fail4.y}
            width={BRANCH_W}
            height={BRANCH_H}
            rx="8"
            fill="#FEF2F2"
            stroke="#DC2626"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[6]}
            y="324"
            textAnchor="middle"
            fill="#991B1B"
            fontSize="11"
            fontWeight="600"
          >
            上游失败 502
          </text>
          <text
            x={centers[6]}
            y="341"
            textAnchor="middle"
            fill="#BE123C"
            fontSize="9"
          >
            超时 / 5xx
          </text>

          <rect
            x={pass.x}
            y={pass.y}
            width={BRANCH_W}
            height={BRANCH_H}
            rx="8"
            fill="#ECFDF5"
            stroke="#059669"
            strokeWidth="1.5"
            filter="url(#rf-shadow)"
          />
          <text
            x={centers[7]}
            y="324"
            textAnchor="middle"
            fill="#065F46"
            fontSize="11"
            fontWeight="600"
          >
            响应直达用户
          </text>
          <text
            x={centers[7]}
            y="341"
            textAnchor="middle"
            fill="#059669"
            fontSize="9"
          >
            头过滤 / 不落盘
          </text>

          {/* 分支下垂线（中心对齐后为直线） */}
          {[
            {
              c: centers[3],
              label: "不合规",
              color: "#DC2626",
              marker: "rf-arrow-red",
            },
            {
              c: centers[4],
              label: "无匹配",
              color: "#DC2626",
              marker: "rf-arrow-red",
            },
            {
              c: centers[5],
              label: "非法",
              color: "#DC2626",
              marker: "rf-arrow-red",
            },
            {
              c: centers[6],
              label: "异常",
              color: "#DC2626",
              marker: "rf-arrow-red",
            },
            {
              c: centers[7],
              label: "回填",
              color: "#059669",
              marker: "rf-arrow-green",
            },
          ].map(({ c, label, color, marker }) => (
            <g key={label}>
              <line
                x1={c}
                y1="240"
                x2={c}
                y2="296"
                stroke={color}
                strokeWidth="1.4"
                markerEnd={`url(#${marker})`}
              />
              <text x={c + 8} y="272" fill={color} fontSize="9">
                {label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
