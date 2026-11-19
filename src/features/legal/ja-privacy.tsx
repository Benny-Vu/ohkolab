import { Link } from "react-router";

import { TelemetrySwitch } from "@/features/feedback/telemetry-switch";
import {
  LegalList,
  LegalSection,
  LegalText,
} from "@/features/legal/legal-page";
import { CONTACT_EMAIL } from "@/features/legal/legal-info";
import { t } from "@/lib/i18n/t";

/**
 * The Japanese Privacy Policy, from the owner-approved draft
 * (`japanese-legal-draft.md` in the vault). The English version stays binding;
 * this is a reference translation that must make the same promises — when
 * the English page changes, this one must change with it. The section ids
 * match the English page exactly (a test enforces it), and the image-post
 * sections follow VITE_IMAGE_POSTS like the English ones.
 */
export function JaPrivacySections({ images }: { images: boolean }) {
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

      <LegalSection id="what-this-covers" heading="このページの対象">
        <LegalText>
          このページは、OHKOLab
          があなたに関する何を・なぜ保存するかを説明します。OHKOLab
          に広告はありません。問題の発見と修正のため、匿名で・Cookieを使わない利用統計とクラッシュレポートを収集します。どちらもいつでもオフにできます（「クラッシュレポートと利用統計」参照）。
        </LegalText>
      </LegalSection>

      <LegalSection id="your-account" heading="あなたのアカウント">
        <LegalText>
          アカウントを作成すると、サインインプロバイダーの Supabase
          が、メールアドレス、メールで登録した場合はハッシュ化されたパスワード、Google
          や Discord
          でサインインした場合はそのプロバイダー名を保存します。また、13歳以上であることと利用規約への同意、およびその同意日も保存されます。
        </LegalText>
      </LegalSection>

      <LegalSection id="your-public-profile" heading="あなたの公開プロフィール">
        <LegalText>
          プロフィールには、ユーザー名と（任意の）表示名・アバター・紹介文が保存されます。プロフィールページは公開で、誰でも
          ohkolab.com/u/ユーザー名 で閲覧できます。
        </LegalText>
      </LegalSection>

      <LegalSection id="your-teams" heading="あなたの構築">
        <LegalText>
          保存した構築には、名前・ルール（シングルまたはダブル）・ポケモンのセットが保存されます。保存した構築は既定で非公開で、あなただけが閲覧できます。構築の「公開」スイッチをオンにすると、他の訪問者がその構築を閲覧できるようになります。
        </LegalText>
      </LegalSection>

      <LegalSection id="community-features" heading="コミュニティ機能">
        <LegalText>
          OHKOLab
          には、投稿・コメント・いいね・フォロー・報告・ブロック・グループ・通知のコミュニティ機能があります。これらの機能は、あなたが作成した投稿・コメント・いいね・フォローなどのコンテンツとやり取りを、あなたと他のユーザーに表示するために保存します。報告は当方のモデレーターが確認し、ブロックは他の人物のコンテンツをあなたから隠します。
        </LegalText>
      </LegalSection>

      {images && (
        <LegalSection id="images" heading="投稿内の画像">
          <LegalText>
            投稿に画像を添付すると、ブラウザーがまずその画像をリサイズし、WebP
            に再エンコードします。この処理で、位置情報を含むメタデータもアップロード前に除去されます。端末から送信されるのは処理後の画像だけです。
          </LegalText>
          <LegalText>
            すべての画像は、他のユーザーが閲覧できるようになる前に自動で確認されます。画像の処理を委託する米国企社
            OpenAI
            が、性的コンテンツ・暴力・自傷に関する審査を行い、審査に通らなかった画像が他のユーザーに表示されることはありません。画像を配信する
            Cloudflare
            も、初回配信時に既知の児童性的虐待記録と照合します。一致した場合は直ちにブロックされ、当局へ報告されます。
          </LegalText>
          <LegalText>
            却下された画像と削除された投稿の画像は、モデレーターだけが閲覧できる閉鎖された保存領域に、削除のモデレーション記録とともに12か月間保管され、その後自動的に削除されます。
          </LegalText>
          <LegalText>
            当方がこの方法で画像を処理するのは、サービスを安全に保つという正当な利益と、法令上の義務を果たすためです。画像が却下された場合はその旨をお知らせし、他の削除と同様に1回申し立てができます。
          </LegalText>
        </LegalSection>
      )}

      <LegalSection id="groups" heading="グループ">
        <LegalText>
          グループには、名前・説明・公開か招待制か・オーナーが保存されます。各メンバーについては、役割と参加状況を保存します。グループの名前と説明は誰でも閲覧でき、公開グループでは所属メンバーも誰でも閲覧できます。招待制グループでは、メンバーリストはメンバーだけが閲覧できます。自分自身の参加状況は常に閲覧できます。
        </LegalText>
      </LegalSection>

      <LegalSection id="notifications" heading="通知">
        <LegalText>
          通知には、何が起きたか（いいね・コメント・フォロー・グループ招待など）、誰が・いつ、既読かどうかが保存されます。自分の通知は自分だけが閲覧できます。
        </LegalText>
      </LegalSection>

      <LegalSection id="telemetry" heading="クラッシュレポートと利用統計">
        <LegalText>
          OHKOLab
          を正常に稼働させ続けるため、2種類のテレメトリを収集します。どちらも匿名で、Cookieは使用しません。
        </LegalText>
        <LegalList>
          <li>
            <strong className="font-medium">クラッシュレポート。</strong>{" "}
            不具合が起きたとき、アプリは EU 内でホストされた Sentry
            にレポートを送信します。内容は、エラー、閲覧中のページ、アプリのバージョン、ブラウザー、画面サイズ、ランダムなセッションID、サインイン中の場合はアカウントID（ランダムなコードで、名前やメールアドレスではありません）です。投稿・コメント・紹介文・ポケモンと技の名前以外の構築詳細・ユーザー名・表示名・メールアドレス・パスワード・認証トークン・IPアドレスは一切含まれません。クラッシュレポートは約30日間保管されます。Android
            アプリでは、Sentry
            のネイティブのクラッシュレポーターでもクラッシュを記録します。送信する内容はウェブサイトと同じ（エラー、閲覧中のページ、アプリのバージョン）で、それ以外は送信しません。クラッシュレポートがオンの場合にのみ送信され、オフにすると直ちに停止します。
          </li>
          <li>
            <strong className="font-medium">利用統計。</strong>{" "}
            どのページが閲覧され、どの機能が使われたかを数えるため、EU
            内でホストされた PostHog
            を使用します。ページビューはページ名のみで記録され、完全なURLでは記録されず、Cookieには何も書き込まれません。利用統計は最大1年間保管されます。
          </li>
        </LegalList>
        <LegalText>
          下のスイッチでクラッシュレポートと利用統計をオフにできます。オフにすると両方とも直ちに停止します。ブラウザーが
          Global Privacy Control または Do Not Track
          のシグナルを送信する場合、利用統計をオフにして尊重します。クラッシュレポートは、スイッチでオフにしない限り継続します。
        </LegalText>
        <TelemetrySwitch />
      </LegalSection>

      <LegalSection id="feedback" heading="フィードバック">
        <LegalText>
          サイトからフィードバックを送ると、メッセージ、種類（バグ・アイデア・その他）、技術情報のチェックボックスがオンの場合は閲覧中のページ・アプリのバージョン・ブラウザー・画面サイズ・直前にクラッシュが起きた場合はそのIDを保存します。フォローアップのためフィードバックはアカウントに紐付けられ、モデレーターが確認します。対応完了後12か月間保管し、アカウントの削除時に削除されます。
        </LegalText>
      </LegalSection>

      <LegalSection id="moderation" heading="モデレーションと申し立て">
        <LegalText>
          コンテンツの削除やアカウントの停止を行った際、何が削除・停止されたか、その理由、対応したモデレーター、日時を保存します。投稿やコメントを削除した場合は、削除前の本文のコピーも記録とともに保管し、あなたとモデレーターが確認できるようにします。申し立てがあった場合は、そのメッセージと結果を保存します。モデレーターはモデレーション記録と申し立てを閲覧できます。あなたは、自分に関わる記録と自分の申し立てを閲覧できます。
          {images &&
            " 画像つき投稿の場合、記録には削除とともにブロックされた画像ファイルも記載されます。"}
        </LegalText>
      </LegalSection>

      <LegalSection id="in-your-browser" heading="ブラウザー内にとどまるデータ">
        <LegalText>
          以下のデータは端末のブラウザー外に出ず、ローカルストレージに保存されます。
        </LegalText>
        <LegalList>
          <li>テーマ（ダーク／ライト）とルール（シングル／ダブル）の設定、</li>
          <li>ダメージ計算ツールの状態、</li>
          <li>
            未サインイン時に作成した構築、そのデータが読み取れなくなった場合のバックアップ、それらの構築をアカウントへコピー済みであることを示すフラグ、
          </li>
          <li>
            サインインを開始した時点で閲覧していたページ（サインイン後に戻るため）、
          </li>
          <li>クラッシュレポートと利用統計をオフにしたかどうか、</li>
          <li>{t("privacy.languageChoice")}、</li>
          <li>サインイン状態を保つセッション。</li>
        </LegalList>
        <LegalText>
          OHKOLab
          のサイトデータをブラウザーから削除すると、これらはすべて消えます。
        </LegalText>
      </LegalSection>

      <LegalSection id="third-parties" heading="第三者">
        <LegalText>
          ポケモンのスプライトは play.pokemonshowdown.com
          から読み込むため、そのホストはブラウザーが発する画像リクエストを把握します。Google
          や Discord
          でサインインした場合は、そのプロバイダーがサインインを処理します。クラッシュレポートは
          Sentry、利用統計は PostHog（いずれも EU
          内でホスト）に送信されます（上記参照）。それぞれのプライバシーポリシーは{" "}
          <a
            href="https://sentry.io/privacy/"
            className="text-primary underline underline-offset-4"
          >
            sentry.io/privacy
          </a>{" "}
          と{" "}
          <a
            href="https://posthog.com/privacy/"
            className="text-primary underline underline-offset-4"
          >
            posthog.com/privacy
          </a>{" "}
          を参照してください。ウェブサイト自体は Cloudflare
          のネットワーク経由で配信されるため、一般的なウェブホストと同様に、Cloudflare
          が ohkolab.com
          へのブラウザーのリクエスト（IPアドレスを含む）を処理します（
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            className="text-primary underline underline-offset-4"
          >
            Cloudflare のプライバシーポリシー
          </a>
          参照）。
          {images ? (
            <>
              {" "}
              投稿に添付された画像は、米国でホストされた OpenAI
              による審査を受けます（「投稿内の画像」参照）。OpenAI
              のプライバシーポリシーは{" "}
              <a
                href="https://openai.com/policies/row-privacy-policy/"
                className="text-primary underline underline-offset-4"
              >
                openai.com
              </a>
              で確認できます。画像は Cloudflare
              経由でも配信され、既知の児童性的虐待記録と照合されます（Cloudflare
              のプライバシーポリシー参照）。これら以外に、OHKOLab
              があなたのデータを第三者へ送信することはありません。
            </>
          ) : (
            " これら以外に、OHKOLab があなたのデータを第三者へ送信することはありません。"
          )}
        </LegalText>
      </LegalSection>

      <LegalSection id="deleting" heading="アカウントの削除">
        <LegalText>
          {" "}
          <Link
            to="/profile"
            className="text-primary underline underline-offset-4"
          >
            プロフィールページ
          </Link>{" "}
          からアカウントを削除できます。削除すると、アカウント・プロフィール・保存した構築・投稿・コメント・いいね・フォロー・ブロック・グループへの参加・所有するグループ・通知
          {images && "、投稿に添付した画像"}
          が、当方のサーバーから完全に削除されます。ブラウザー内に保存されたデータは削除されないため、そちらはブラウザーのサイトデータを削除してください。
        </LegalText>
        <LegalText>
          モデレーション記録は例外です。あなたに対して行われた処分とその理由、削除したコンテンツのコピー、申し立てとその結果、停止措置の記録です。決定後（停止の場合は停止終了後）12か月間、アカウント削除後も保管し続けます。これは、当方の決定を説明し、法令により要求される場合に警察へ証拠を提供するためです。アカウント削除後、記録はアカウントと紐付けられなくなります。12か月経過後、自動的に削除されます。
        </LegalText>
        <LegalText>
          手順は
          <Link
            to="/delete-account"
            className="text-primary underline underline-offset-4"
          >
            アカウント削除ページ
          </Link>
          をご覧ください。
        </LegalText>
      </LegalSection>

      <LegalSection id="changes" heading="ポリシーの変更">
        <LegalText>
          OHKOLab
          の成長に合わせて本ポリシーを更新することがあります。ページ上部の「最終更新」が現在の版を示します。
        </LegalText>
      </LegalSection>

      <LegalSection id="contact" heading="お問い合わせ">
        <LegalText>
          あなたのデータについてのご質問は{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          まで。{" "}
          <Link
            to="/terms"
            className="text-primary underline underline-offset-4"
          >
            利用規約
          </Link>{" "}
          もご覧ください。
        </LegalText>
      </LegalSection>
    </div>
  );
}
