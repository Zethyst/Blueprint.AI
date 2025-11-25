"use client";
import mixpanel from "mixpanel-browser";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

let isMixpanelInitialized = false;

export default function MixpanelInitializer({ MIXPANEL_TOKEN }) {
  const { data: session } = useSession();

  useEffect(() => {
    const initMixpanel = () => {
      if (!MIXPANEL_TOKEN) {
        console.warn("Mixpanel token is missing!");
        return;
      }

      mixpanel.init(MIXPANEL_TOKEN, {
        autocapture: true,
        track_pageview: true,
        persistence: "localStorage",
      });

      isMixpanelInitialized = true;
    };

    const initializeAnonymousUser = () => {
      // If user logged in
      if (session?.user) {
        const userId = session.user._id;
        const storedAnonId = localStorage.getItem("mp_anon_id");

        // Link anonymous history to real user
        if (storedAnonId && storedAnonId !== userId) {
          mixpanel.alias(userId);
        }

        mixpanel.identify(userId);

        mixpanel.people.set({
          $email: session.user.email,
          $first_name: session.user.name?.split(" ")[0] ?? "",
          $last_name: session.user.name?.split(" ")[1] ?? "",
          username: session.user.username,
        });

        return;
      }

      // If user not logged in
      let anonId = localStorage.getItem("mp_anon_id");
      if (!anonId) {
        anonId = uuidv4();
        localStorage.setItem("mp_anon_id", anonId);
      }

      mixpanel.identify(anonId);
    };

    initMixpanel();
    if (isMixpanelInitialized) {
      initializeAnonymousUser();
    }
  }, [session]);

  return null;
}

export const trackEvent = (eventName, properties = {}) => {
  try {
    if (isMixpanelInitialized) {
      mixpanel.track(eventName, properties);
    }
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};
