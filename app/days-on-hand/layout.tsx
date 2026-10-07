export default function DaysOnHandLayout({ children }: LayoutProps<"/days-on-hand">) {
  return (
    <div data-page="wide" data-sidebar="wide" className="w-full">
      {children}
    </div>
  )
}
