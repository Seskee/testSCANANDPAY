interface FooterProps {
  backgroundColor?: string
  showContent?: boolean
}

export function Footer({ backgroundColor = "bg-white/80", showContent = false }: FooterProps) {
  return (
    <footer className={`fixed bottom-0 w-full ${backgroundColor} backdrop-blur-sm border-t`}>
      <div className="container flex h-14 items-center justify-center">
        {showContent ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 mb-1">
              The Smartest Payment & POS Solution. Fast. Secure. Contactless.
            </p>
            <p className="text-xs text-gray-600">
              © 2025 Scan&Pay
            </p>
          </div>
        ) : (
          <div className="h-14" />
        )}
      </div>
    </footer>
  )
}