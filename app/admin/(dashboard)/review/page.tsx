import { listCaptures } from '@/lib/captures'
import ReviewCard from './ReviewCard'

export default async function ReviewPage() {
  // 확정 대기 = 아직 confirmed/discarded 가 아닌 모든 포착
  const [raw, refined, failed] = await Promise.all([
    listCaptures({ status: 'raw', limit: 100 }),
    listCaptures({ status: 'refined', limit: 100 }),
    listCaptures({ status: 'failed', limit: 100 }),
  ])
  const pending = [...raw, ...refined, ...failed].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">검토·확정</h1>

      <p className="text-sm text-muted-foreground">
        항목을 클릭해 펼친 뒤, 카카오에서 장소를 찾아 정보를 채우고 <b className="text-foreground">확정</b>하세요. 원문을
        보고 특징·태그를 직접 뽑으면 돼요.
      </p>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">확정 대기 {pending.length}</h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">대기 중인 캡처가 없어요. 먼저 포착하세요.</p>
        )}
        {pending.map((c) => (
          <ReviewCard key={c.id} capture={c} />
        ))}
      </div>
    </div>
  )
}
