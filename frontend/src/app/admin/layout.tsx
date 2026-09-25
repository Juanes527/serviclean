import DisenoPanel from '@/components/DisenoPanel';
import ProtegerRuta from '@/components/ProtegerRuta';

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <ProtegerRuta rol="ADMINISTRADOR">
      <DisenoPanel rol="ADMINISTRADOR">{children}</DisenoPanel>
    </ProtegerRuta>
  );
}
