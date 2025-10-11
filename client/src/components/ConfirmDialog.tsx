// src/components/ConfirmDialog.tsx
export default function ConfirmDialog({id, message, onConfirm}:{id:string;message:string;onConfirm:()=>void;}){
  return (
    <dialog id={id}>
      <article>
        <header><strong>Confirm</strong></header>
        <p>{message}</p>
        <footer>
          <button className="secondary" onClick={()=> (document.getElementById(id) as HTMLDialogElement).close()}>Cancel</button>
          <button onClick={()=>{ onConfirm(); (document.getElementById(id) as HTMLDialogElement).close(); }}>OK</button>
        </footer>
      </article>
    </dialog>
  );
}