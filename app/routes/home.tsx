import type { Route } from "./+types/home";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users } from "~/db/schema";
import { DevUI } from "~/components/dev-ui";
import { getCurrentUserId, getDevCountry } from "~/lib/session";
import { getCountryTierInfo, COUNTRIES } from "~/lib/ppp";
import { describeCatalog } from "~/modules/landing-page";
import { landingPage } from "~/modules/landing-page/index.server";
import { LandingHeader } from "~/components/landing/landing-header";
import { LandingHero } from "~/components/landing/landing-hero";
import { LandingBenefits } from "~/components/landing/landing-benefits";
import { FeaturedCourses } from "~/components/landing/featured-courses";
import {
  LandingClosing,
  LandingFooter,
} from "~/components/landing/landing-closing";

function getAllUsers() {
  return db.select().from(users).all();
}

function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function meta() {
  return [
    { title: "Cadence — Learn at your own pace" },
    {
      name: "description",
      content:
        "A modern course platform for developers. Browse courses, track your progress, and learn at your own pace.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const showcase = landingPage.getShowcase();
  const users = getAllUsers();
  const currentUserId = await getCurrentUserId(request);
  const currentUser = currentUserId ? getUserById(currentUserId) : null;
  const devCountry = await getDevCountry(request);
  const countryTierInfo = getCountryTierInfo(devCountry);

  return {
    featuredCourses: showcase.featuredCourses,
    catalogSummary: describeCatalog(
      showcase.courseCount,
      showcase.categoryCount
    ),
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    currentUser: currentUser
      ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
      : null,
    devCountry,
    countryTierInfo,
    countries: COUNTRIES,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    featuredCourses,
    catalogSummary,
    users,
    currentUser,
    devCountry,
    countryTierInfo,
    countries,
  } = loaderData;
  const signedIn = currentUser !== null;

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader signedIn={signedIn} />
      <LandingHero
        signedIn={signedIn}
        catalogSummary={catalogSummary}
        spotlight={featuredCourses[0]}
      />
      <LandingBenefits />
      <FeaturedCourses courses={featuredCourses} />
      <LandingClosing signedIn={signedIn} />
      <LandingFooter signedIn={signedIn} />
      <DevUI
        users={users}
        currentUser={currentUser}
        devCountry={devCountry}
        countryTierInfo={countryTierInfo}
        countries={countries}
      />
    </div>
  );
}
