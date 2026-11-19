import { Link } from "react-router";

import {
  LegalList,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { CONTACT_EMAIL } from "@/features/legal/legal-info";

/**
 * The Japanese Terms of Service, from the owner-approved draft
 * (`japanese-legal-draft.md` in the vault). The English version stays binding;
 * this is a reference translation that must make the same promises — when
 * the English page changes, this one must change with it. The section ids
 * match the English page exactly (a test enforces it).
 */
export function JaTermsSections({
  images,
  messages = false,
}: {
  images: boolean;
  messages?: boolean;
}) {
  return (
    <div className="space-y-8">
      <LegalSection id="operator" heading="OHKOLab の運営者">
        <LegalText>
          OHKOLab は Vu Forge（Benny Vu）が運営しています。お問い合わせは{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          まで。
        </LegalText>
      </LegalSection>

      <LegalSection
        id="unofficial"
        heading="非公式のファンプロジェクトであること"
      >
        <LegalText>
          OHKOLab
          は『ポケモンチャンピオンズ』の非公式ファンプロジェクトです。任天堂・ゲームフリーク・クリーチャーズ・株式会社ポケモンのいずれとも提携・公認・後援の関係はありません。ポケットモンスターシリーズおよび『ポケモンチャンピオンズ』は、それぞれの権利者の商標です。
        </LegalText>
      </LegalSection>

      <LegalSection id="who-can-use" heading="利用できる人">
        <LegalText>
          アカウントを作成するには満16歳以上である必要があります。OHKOLab
          を利用することで、あなたはこの年齢要件を満たしていることを確認したものとみなします。
        </LegalText>
      </LegalSection>

      <LegalSection id="acceptable-use" heading="禁止事項">
        <LegalText>
          OHKOLab
          では、公開構築・プロフィール情報・コミュニティ投稿などのコンテンツを共有できます。以下の内容を投稿・共有しないでください。
        </LegalText>
        <LegalList>
          <li>他の人物への嫌がらせ、脅迫、いじめ</li>
          <li>他者に対する憎悪や差別の助長</li>
          <li>性的なコンテンツ</li>
          <li>スパム、または意図的な偽装・誤解を招く内容</li>
          <li>違法な内容、またはあなたに適用される法令・ルールに反する内容</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="moderation" heading="モデレーションと停止">
        <LegalText>
          本規約に反するコンテンツを削除することがあります。また、重大な違反や繰り返しの違反があるアカウントを停止または削除することがあります。OHKOLab
          の稼働と安全を保つなど、その他の理由でコンテンツを削除することもあります。
        </LegalText>
      </LegalSection>

      <LegalSection id="groups" heading="グループ">
        <LegalText>
          グループは、メンバー自身が作成・運営する場です。グループのオーナーとモデレーターは、そのグループ内の投稿やメンバーを含む運営に責任を負います。グループが本規約に違反した場合、グループを削除したり、オーナー・モデレーターの権限を取り消すことがあります。
        </LegalText>
      </LegalSection>

      {messages && (
        <LegalSection id="direct-messages" heading="ダイレクトメッセージ">
          <LegalText>
            ダイレクトメッセージは、あなたともう一人のプレイヤーとの間だけのものです。他のプレイヤーへの嫌がらせ、脅迫、スパム、そして未成年に関わる性的コンテンツの送信は禁止します。メッセージは報告でき、報告はプライバシーポリシーに記載のコピーを使って審査されます。これらのルールに違反すると、メッセージの削除、アカウントの停止や削除につながることがあります。
          </LegalText>
        </LegalSection>
      )}

      {images && (
        <LegalSection id="images" heading="投稿内の画像">
          <LegalText>
            1件の投稿に4枚まで画像を添付できます。共有する権利を持つ画像のみを添付してください。また、以下の画像をアップロードしないでください。
          </LegalText>
          <LegalList>
            <li>性的なコンテンツを含むもの</li>
            <li>暴力や残酷な描写を含むもの</li>
            <li>
              他の人物の顔・住所・メッセージなどの個人データを、当人の許可なく含むもの
            </li>
            <li>「禁止事項」のルールに反するもの</li>
          </LegalList>
          <LegalText>
            すべての画像は、他のユーザーに表示される前に自動で審査されます。審査に通らなかった画像は表示されず、理由が通知されます。これらの理由、または「モデレーションと停止」の他の理由により、いつでも画像を削除できます。削除された画像は、他の削除と同様に申し立てができます。
          </LegalText>
        </LegalSection>
      )}

      <LegalSection id="notifications" heading="通知">
        <LegalText>
          あなたのコンテンツへのいいね・コメント・新しいフォロワーなどのアクティビティ、グループへの招待、投稿の削除などあなたに影響するモデレーション処分について、アプリ内通知を送信します。通知はいつでも削除できます。
        </LegalText>
      </LegalSection>

      <LegalSection id="removal-notices" heading="削除の通知と申し立て">
        <LegalText>
          コンテンツの削除やアカウントの停止を行う際は、その理由をお知らせします。削除・停止について、1回につき1回申し立てができます。申し立てが認められた場合、削除されたコンテンツの復元または停止の解除を行います。
        </LegalText>
      </LegalSection>

      <LegalSection id="reporting" heading="報告">
        <LegalText>
          サインイン中は、サイト上から投稿・コメント・プロフィールを報告できます。未サインインの場合は{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          へメールで報告できます。
        </LegalText>
      </LegalSection>

      <LegalSection id="your-content" heading="あなたのコンテンツ">
        <LegalText>
          構築・プロフィール情報・投稿など、あなたが作成したコンテンツはあなたのものです。OHKOLab
          で共有することにより、当サイトの一部として保存・表示する許可を当方に与えるものとします（例:
          公開構築やプロフィールを他の訪問者に表示する）。この許可は、コンテンツまたはアカウントを削除した時点で終了します。
        </LegalText>
      </LegalSection>

      <LegalSection id="no-warranty" heading="無保証">
        <LegalText>
          OHKOLab
          は「現状有姿」で提供され、いかなる保証もありません。サイトの可用性・正確性・継続性を保証するものではなく、利用に起因するいかなる損失に対しても責任を負いません。
        </LegalText>
      </LegalSection>

      <LegalSection id="changes" heading="規約の変更">
        <LegalText>
          OHKOLab
          の成長に合わせて本規約を更新することがあります。ページ上部の「最終更新」が現在の版を示します。変更後も
          OHKOLab を使い続けた場合、更新後の規約に同意したものとみなします。
        </LegalText>
      </LegalSection>

      <LegalSection id="contact" heading="お問い合わせ">
        <LegalText>
          本規約についてのご質問は{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          まで。{" "}
          <Link
            to="/privacy"
            className="text-primary underline underline-offset-4"
          >
            プライバシーポリシー
          </Link>
          もご覧ください。
        </LegalText>
      </LegalSection>
    </div>
  );
}
