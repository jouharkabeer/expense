type Props = { label: string; value: string | number }

export default function Card({ label, value }: Props) {
  const formatted = typeof value === 'number' ? value.toFixed(2) : Number(value).toFixed(2)
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value">₹ {formatted}</div>
    </div>
  )
}




