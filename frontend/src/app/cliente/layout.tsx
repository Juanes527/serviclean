import DisenoPanel from '@/components/DisenoPanel';
import ProtegerRuta from '@/components/ProtegerRuta';

export default function LayoutCliente({ children }: { children: React.ReactNode }) {
  return (
    <ProtegerRuta rol="CLIENTE">
      <DisenoPanel rol="CLIENTE">{children}</DisenoPanel>
    </ProtegerRuta>
  );
}
