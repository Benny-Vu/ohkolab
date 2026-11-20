import { Link } from "react-router";

import { CONTACT_EMAIL } from "@/features/legal/legal-info";
import {
  LegalList,
  LegalPage,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { useLocale } from "@/lib/i18n/locale";
import { imagePostsEnabled } from "@/lib/social";

// Like the privacy page, the image-post wording appears only when the
// VITE_IMAGE_POSTS flag is on, so this page never describes deletion that
// isn't happening.
const IMAGES = imagePostsEnabled();

const SECTIONS: Array<{ id: string; heading: string; headingJa: string }> = [
  {
    id: "how-to-delete",
    heading: "How to delete your account",
    headingJa: "アカウントを削除する方法",
  },
  {
    id: "cant-sign-in",
    heading: "Can't sign in?",
    headingJa: "サインインできない場合",
  },
  {
    id: "what-is-deleted",
    heading: "What is deleted",
    headingJa: "削除されるもの",
  },
  {
    id: "what-is-kept",
    heading: "What is kept, and for how long",
    headingJa: "保管されるものと期間",
  },
];

/**
 * The account deletion page (/delete-account). Google Play requires a public
 * web address where anyone can ask for their account to be deleted, reachable
 * without the app. Every fact on this page comes from the privacy policy's
 * "Deleting your account" and "Moderation and appeals" sections; the Japanese
 * version is a reference translation like the other legal pages.
 */
export function DeleteAccountPage() {
  const [locale] = useLocale();
  const ja = locale === "ja";
  const sections = SECTIONS.map(({ id, heading, headingJa }) => ({
    id,
    heading: ja ? headingJa : heading,
  }));

  if (ja) {
    return (
      <LegalPage
        title="アカウントの削除"
        description="アカウントの削除方法と、削除されるものについて。"
        sections={sections}
      >
        <div className="space-y-8">
          <LegalSection id="how-to-delete" heading="アカウントを削除する方法">
            <LegalText>
              アプリでもウェブサイト（ohkolab.com）でも、自分でアカウントを削除できます。
            </LegalText>
            <LegalList>
              <li>
                <Link
                  to="/profile"
                  className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
                >
                  プロフィールページ
                </Link>
                を開きます（アプリでは「プロフィール」タブ）。
              </li>
              <li>
                「危険な操作」セクションまでスクロールし、「アカウントを削除」を選びます。
              </li>
              <li>
                確認のためユーザー名を入力すると、アカウントは完全に削除され、元に戻せません。
              </li>
            </LegalList>
          </LegalSection>

          <LegalSection id="cant-sign-in" heading="サインインできない場合">
            <LegalText>
              削除したいアカウントのメールアドレスから{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              まで、削除のご依頼をメールでお送りください。
            </LegalText>
          </LegalSection>

          <LegalSection id="what-is-deleted" heading="削除されるもの">
            <LegalText>
              アカウントを削除すると、当方のサーバーから次のものが完全に削除されます。
            </LegalText>
            <LegalList>
              <li>アカウント</li>
              <li>プロフィール</li>
              <li>保存した構築</li>
              <li>投稿・コメント・いいね・フォロー・ブロック</li>
              <li>グループへの参加と所有するグループ</li>
              <li>通知</li>
              {IMAGES && <li>投稿に添付した画像</li>}
            </LegalList>
            <LegalText>
              ブラウザー内に保存されたデータは削除されません。こちらも削除するには、OHKOLab
              のサイトデータをブラウザーから削除してください。
            </LegalText>
          </LegalSection>

          <LegalSection id="what-is-kept" heading="保管されるものと期間">
            <LegalText>
              モデレーション記録は例外です。あなたに対して行われた処分とその理由、削除したコンテンツのコピー、申し立てとその結果、停止措置の記録です。各記録は決定後（停止の場合は停止終了後）12か月間保管されます。アカウント削除後、記録はアカウントと紐付けられなくなり、12か月経過後に自動的に削除されます。
            </LegalText>
            <LegalText>
              詳細は
              <Link
                to="/privacy"
                className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
              >
                プライバシーポリシー
              </Link>
              をご覧ください。
            </LegalText>
          </LegalSection>
        </div>
      </LegalPage>
    );
  }

  return (
    <LegalPage
      title="Delete your account"
      description="How to delete your account and what deletion removes."
      sections={sections}
    >
      <div className="space-y-8">
        <LegalSection id="how-to-delete" heading="How to delete your account">
          <LegalText>
            You can delete your account yourself, in the app or on the website
            at ohkolab.com:
          </LegalText>
          <LegalList>
            <li>
              Open your{" "}
              <Link
                to="/profile"
                className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
              >
                profile page
              </Link>{" "}
              (in the app: the Profile tab).
            </li>
            <li>
              Scroll to the <strong className="font-medium">Danger zone</strong>{" "}
              section and select{" "}
              <strong className="font-medium">Delete account</strong>.
            </li>
            <li>
              Type your username to confirm. Your account is then deleted
              permanently, and this cannot be undone.
            </li>
          </LegalList>
        </LegalSection>

        <LegalSection id="cant-sign-in" heading="Can't sign in?">
          <LegalText>
            Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            from the email address of the account you want deleted, and ask us
            to delete it.
          </LegalText>
        </LegalSection>

        <LegalSection id="what-is-deleted" heading="What is deleted">
          <LegalText>
            Deleting your account permanently removes, from our servers:
          </LegalText>
          <LegalList>
            <li>your account,</li>
            <li>your profile,</li>
            <li>your saved teams,</li>
            <li>your posts, comments, likes, follows and blocks,</li>
            <li>your group memberships and groups you own,</li>
            <li>your notifications{IMAGES ? "," : "."}</li>
            {IMAGES && <li>the images you attached to posts.</li>}
          </LegalList>
          <LegalText>
            Data stored in your browser is not removed. To remove that too,
            clear your browser's site data for OHKOLab.
          </LegalText>
        </LegalSection>

        <LegalSection
          id="what-is-kept"
          heading="What is kept, and for how long"
        >
          <LegalText>
            Moderation records are an exception. These are the actions taken
            against you and their reasons, a copy of the content we removed,
            your appeals and their outcomes, and your suspensions. We keep each
            record for 12 months after the decision (for a suspension, 12 months
            after it ends). After you delete your account, the records no longer
            link to it, and we delete them automatically once the 12 months have
            passed.
          </LegalText>
          <LegalText>
            The full details are in our{" "}
            <Link
              to="/privacy"
              className="text-primary underline underline-offset-4 relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']"
            >
              privacy policy
            </Link>
            .
          </LegalText>
        </LegalSection>
      </div>
    </LegalPage>
  );
}
