import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

type LifeOSModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function LifeOSModal({ title, children, onClose }: LifeOSModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
