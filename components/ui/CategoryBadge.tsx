// components/ui/CategoryBadge.tsx
import type { ComplaintCategory } from '@/types/database'
import { isRestrictedCategory } from '@/types/database'
import { Lock } from 'lucide-react'

const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  infrastructure: 'Infrastructure',
  academic: 'Academic',
  hostel: 'Hostel',
  mess: 'Mess',
  facilities: 'Facilities',
  conduct: 'Conduct',
  harassment: 'Harassment',
  discrimination: 'Discrimination',
  safety: 'Safety',
}

export default function CategoryBadge({ category }: { category: ComplaintCategory }) {
  const restricted = isRestrictedCategory(category)
  return (
    <span
      className={`badge ${restricted ? 'badge-restricted' : 'badge-public'}`}
      aria-label={`Category: ${CATEGORY_LABELS[category]}${restricted ? ' (restricted)' : ''}`}
    >
      {restricted && <Lock size={10} aria-hidden="true" />}
      {CATEGORY_LABELS[category]}
    </span>
  )
}
