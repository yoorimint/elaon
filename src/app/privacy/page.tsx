import Link from "next/link";

export const metadata = {
  title: "개인정보처리방침 | eloan",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
      <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        ← 홈으로
      </Link>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold">개인정보처리방침</h1>
      <p className="mt-2 text-xs text-neutral-500">시행일자: 2026년 4월 21일</p>

      <div className="prose prose-neutral dark:prose-invert mt-6 text-sm leading-7">
        <p>
          eloan(이하 "회사")은 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」과
          「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수합니다.
          본 방침은 회사가 수집하는 개인정보 항목과 처리 방법에 대해 안내합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">1. 수집하는 개인정보 항목</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>회원가입 시 수집 (필수)</b>
            <ul className="list-[circle] pl-5 mt-1 space-y-0.5">
              <li>이메일 주소</li>
              <li>비밀번호 (단방향 암호화되어 저장, 원문은 회사도 확인 불가)</li>
              <li>닉네임 (이메일 앞부분을 기반으로 자동 생성, 변경 가능)</li>
            </ul>
          </li>
          <li>
            <b>서비스 이용 과정에서 자동 수집</b>
            <ul className="list-[circle] pl-5 mt-1 space-y-0.5">
              <li>방문 집계용 익명 식별자(localStorage에 저장되는 무작위 ID), 방문 일자</li>
              <li>서비스 제공을 위한 쿠키(로그인 세션)</li>
              <li>접속 로그는 호스팅 제공업체 수준에서 일시적으로 기록될 수 있습니다</li>
            </ul>
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-6">2. 수집·이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 로그인·로그아웃 관리</li>
          <li>커뮤니티 게시글·댓글 작성자 표시</li>
          <li>백테스트 결과 공유 및 저장</li>
          <li>이용자 간 분쟁 발생 시 사실관계 확인</li>
          <li>서비스 품질 개선 및 통계(방문 집계 등) 목적</li>
          <li>악성 이용자 식별 및 제재</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">3. 보유 및 이용 기간</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 정보: 회원 탈퇴 시 즉시 삭제</li>
          <li>게시글·댓글: 이용자가 직접 삭제하거나 회원 탈퇴 시 함께 삭제 (작성자 정보 연결 해제)</li>
          <li>
            단, 관계 법령에 따라 보존이 필요한 경우 법정 기간 동안 별도 저장
            (예: 「전자상거래법」에 따른 분쟁처리 기록 등 해당 시)
          </li>
        </ul>

        <h2 className="text-lg font-bold mt-6">4. 제3자 제공</h2>
        <p>
          회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 법령에 의해 수사기관이
          적법한 절차에 따라 요청하는 경우는 예외로 합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">5. 개인정보 처리 위탁</h2>
        <p>원활한 서비스 제공을 위해 아래와 같이 국외 업체에 개인정보 처리를 위탁합니다.</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs border border-neutral-300 dark:border-neutral-700">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-left">
                  수탁업체
                </th>
                <th className="border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-left">
                  위탁 업무
                </th>
                <th className="border border-neutral-300 dark:border-neutral-700 px-2 py-1 text-left">
                  이전 국가
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">
                  Supabase Inc.
                </td>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">
                  회원 인증, 데이터베이스 저장
                </td>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">미국</td>
              </tr>
              <tr>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">
                  Vercel Inc.
                </td>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">
                  웹사이트 호스팅
                </td>
                <td className="border border-neutral-300 dark:border-neutral-700 px-2 py-1">미국</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-bold mt-6">6. 이용자의 권리</h2>
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>자신의 개인정보 열람 및 수정 요청 (내정보 페이지)</li>
          <li>회원 탈퇴 (내정보 페이지)</li>
          <li>개인정보 처리에 관한 문의: 아래 개인정보 보호책임자에게 연락</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">7. 쿠키 및 로컬 저장소</h2>
        <p>회사는 다음 목적으로 쿠키·localStorage를 사용합니다.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>로그인 세션 유지</li>
          <li>방문자 통계용 익명 식별자(개인을 식별하지 않으며 집계에만 사용)</li>
          <li>모의투자 세션 데이터(이용자 브라우저에만 저장)</li>
        </ul>
        <p>브라우저 설정에서 쿠키·로컬 저장소를 차단할 수 있으나, 이 경우 로그인 등 일부 기능이 제한될 수 있습니다.</p>

        <h2 className="text-lg font-bold mt-6">8. 개인정보의 안전성 확보 조치</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>비밀번호는 해시 함수로 단방향 암호화되어 저장</li>
          <li>모든 통신은 HTTPS로 암호화</li>
          <li>데이터베이스 접근은 Row Level Security 정책으로 제한</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">9. 개인정보 보호책임자</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>이름: 운영자</li>
          <li>연락처: admin@eloan.kr</li>
        </ul>

        <h2 className="text-lg font-bold mt-6">10. 방침의 변경</h2>
        <p>
          본 개인정보처리방침은 법령, 정책 또는 서비스의 변경에 따라 수정될 수 있으며,
          변경 시 적용일자 7일 전부터 공지합니다.
        </p>

        <h2 className="text-lg font-bold mt-6">부칙</h2>
        <p>본 방침은 2026년 4월 21일부터 시행됩니다.</p>
      </div>
    </main>
  );
}
