import { AIDailyBrief } from '@/components/ai/AIDailyBrief';

export default function DailyBrief() {
  return (
    <div className="container py-8">
      <AIDailyBrief autoGenerate={true} />
    </div>
  );
}
