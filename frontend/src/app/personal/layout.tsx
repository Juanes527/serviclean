import DisenoPanel from '@/components/DisenoPanel';
import ProtegerRuta from '@/components/ProtegerRuta';

export default function LayoutPersonal({ children }: { children: React.ReactNode }) {
  return (
    <ProtegerRuta rol="PERSONAL_ASEO">
      <DisenoPanel rol="PERSONAL_ASEO">{children}</DisenoPanel>
    </ProtegerRuta>
  );
}
