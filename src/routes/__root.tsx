import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Corpse Ledger · Graveyard Keeper 2 Planner',
      },
      {
        name: 'description',
        content: 'Plan 14-white-skull burials in Graveyard Keeper 2 using your shared organ stock, solutions, injections, and organ improvers.',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: `${import.meta.env.BASE_URL}icons/i_skull.svg` },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
