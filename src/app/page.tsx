import { AppShell } from "@/components/app-shell";

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  return <AppShell initialSearch={searchParams} />;
}
