import Link from "next/link";

export const metadata = {
  title: "이용약관 | eloan",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        ← 홈으로
      </Link>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold">이용약관</h1>
      <p className="mt-2 text-xs text-neutral-500">
        시행일자: 2026년 4월 21일
      </p>

      <div className="prose prose-neutral dark:prose-invert mt-6 text-sm leading-7">
        <h2 className="text-lg font-bold mt-6">제1조 (목적)</h2>
        <p>
          이 약관은 eloan(이하 "회사")이 제공하는 웹사이트 www.eloan.kr 및 관련 제반 서비스
          (이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항, 기타
          필요한 사항을 규정함을 목적으로 합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">제2조 (정의)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>"서비스"란 회사가 제공하는 백테스트, 모의투자, 커뮤니티, 랭킹 등 모든 기능을 말합니다.</li>
          <li>"회원"이란 본 약관에 동의하고 서비스에 가입한 이용자를 말합니다.</li>
          <li>"백테스트"란 과거 시세 데이터를 이용한 가상의 매매 시뮬레이션을 의미합니다.</li>
          <li>"모의투자"란 실시간 시세를 기준으로 한 가상의 매매 기록 서비스이며, 실제 주문이 발생하지 않습니다.</li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제3조 (약관의 효력 및 변경)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>이 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
          <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 7일 전부터 공지합니다.</li>
          <li>이용자가 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제4조 (회원가입)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>회원가입은 이용자가 이 약관과 개인정보처리방침에 동의한 후, 이메일과 비밀번호를 입력하여 신청함으로써 이루어집니다.</li>
          <li>회사는 다음 각 호에 해당하는 경우 가입을 거부하거나 사후 취소할 수 있습니다.
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>타인의 정보를 도용한 경우</li>
              <li>허위 정보를 기재한 경우</li>
              <li>법령 또는 약관을 위반한 이력이 있는 경우</li>
            </ul>
          </li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제5조 (서비스 제공)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>회사는 다음 서비스를 제공합니다: 백테스트, 모의투자, 커뮤니티(게시글·댓글), 랭킹, 전략 공유.</li>
          <li>시세 데이터는 업비트, Yahoo Finance, OKX 등 외부 공개 API를 통해 수집되며, 회사는 데이터의 정확성·완전성·실시간성을 보증하지 않습니다.</li>
          <li>회사는 시스템 점검, 장애 등의 사유로 서비스를 일시 중단할 수 있으며, 가능한 경우 사전 공지합니다.</li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제6조 (이용 제한 및 제재)</h2>
        <p>
          회사는 다음과 같은 행위를 한 이용자에 대해 사전 경고 없이 게시글 삭제, 계정 제재,
          이용 정지 등의 조치를 취할 수 있습니다.
        </p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>타인을 비방·모욕하거나 허위사실을 유포하는 행위</li>
          <li>음란물, 불법 광고, 스팸을 게시하는 행위</li>
          <li>특정 자산에 대한 매수/매도 추천을 가장한 시세 조종 의도의 글을 게시하는 행위</li>
          <li>시스템을 악용하거나 다른 이용자의 계정·개인정보를 침해하는 행위</li>
          <li>기타 관계 법령 또는 본 약관을 위반하는 행위</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">제7조 (이용자의 의무)</h2>
        <p>
          이용자는 자신의 계정과 비밀번호를 스스로 관리해야 하며, 이를 타인에게 양도·대여할
          수 없습니다. 계정 정보 유출로 인한 손해에 대해 회사는 책임을 지지 않습니다.
        </p>

        <h2 className="text-lg font-bold mt-6">제8조 (면책조항)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>
            <b>본 서비스는 투자 자문 서비스가 아닙니다.</b>
            백테스트, 모의투자, 커뮤니티 게시글을 포함한 모든 콘텐츠는 정보 제공 목적이며,
            투자 권유나 자문에 해당하지 않습니다.
          </li>
          <li>
            <b>모든 투자 판단과 그에 따른 결과는 이용자 본인의 책임입니다.</b>
            과거 수익률은 미래 수익을 보장하지 않으며, 회사는 이용자의 투자 결과에 대해
            어떠한 책임도 지지 않습니다.
          </li>
          <li>
            외부 데이터 제공처의 오류, 네트워크 장애, 천재지변 등 회사의 귀책사유가 아닌
            사유로 발생한 손해에 대해 회사는 책임을 지지 않습니다.
          </li>
          <li>
            이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 회사는
            개입할 의무가 없습니다.
          </li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제9조 (지적재산권)</h2>
        <ol className="list-decimal pl-5 space-y-1">
          <li>서비스에 포함된 회사의 콘텐츠에 대한 저작권은 회사에 귀속됩니다.</li>
          <li>이용자가 서비스에 게시한 콘텐츠에 대한 저작권은 이용자에게 있으며, 회사는 서비스 운영·홍보 목적으로 이를 활용할 수 있습니다.</li>
        </ol>

        <h2 className="text-lg font-bold mt-6">제10조 (준거법 및 관할)</h2>
        <p>
          본 약관은 대한민국 법을 준거법으로 하며, 서비스 이용과 관련하여 분쟁이 발생할 경우
          민사소송법상의 관할 법원에 소를 제기합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">부칙</h2>
        <p>본 약관은 2026년 4월 21일부터 시행됩니다.</p>
      </div>
    </main>
  );
}
