type Props = { label: string; value: string | number }

export default function AgeCard({ label, value }: Props) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
