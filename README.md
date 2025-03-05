# Iceberg Research

A Next.js application with Supabase integration for research and data management.

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Supabase](https://supabase.io/) for backend and authentication
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Radix UI](https://www.radix-ui.com/) for accessible UI components

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/iceberg-research.git
   cd iceberg-research
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables:
   - Create a `.env.local` file in the project root
   - Add the following variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     NEXT_PUBLIC_SITE_URL=http://localhost:3000
     ```

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

- `app/` - Next.js app router pages and layouts
- `components/` - Reusable UI components
- `lib/` - Utility functions and shared logic
- `public/` - Static assets
- `styles/` - Global styles

## Setting Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Set up the necessary tables for your application
3. Get your project URL and anon key from the API settings
4. Add these to your `.env.local` file

## Deployment

The application can be deployed on [Vercel](https://vercel.com/) or any other Next.js compatible hosting service.

### Deploying to Vercel

1. Push your code to GitHub
2. Visit [Vercel](https://vercel.com/new) and import your GitHub repository
3. Configure the following environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Deploy your application

For automated deployments, this project includes GitHub Actions workflows in the `.github/workflows` directory.

```bash
npm run build
# or
yarn build
```

## License

[MIT](LICENSE) 